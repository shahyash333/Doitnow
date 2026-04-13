import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';

import {
  AddressOption,
  ServiceBookingPayload,
} from '../../shared/components/service-booking-form/service-booking-form.component';
import { CatalogService, CatalogServiceItem } from '../../core/services/catalog.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
})
export class BookingPage implements OnDestroy {
  serviceName = 'Service Booking';
  startingPrice = 299;
  selectedService: CatalogServiceItem | null = null;
  isServiceLoading = false;
  isSubmitting = false;
  userPhone: string | null = null;
  userAddresses: AddressOption[] = [];
  private readonly userSubscription: Subscription;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly toastController: ToastController,
    private readonly catalogService: CatalogService,
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
  ) {
    const currentUser = this.authService.getCurrentUser();
    this.userPhone = currentUser?.phone?.trim() || null;
    this.userAddresses = this.mapAddressesToOptions(currentUser?.addresses);
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.userPhone = user?.phone?.trim() || null;
      this.userAddresses = this.mapAddressesToOptions(user?.addresses);
    });

    this.activatedRoute.queryParams.subscribe((params: Params) => {
      void this.resolveServiceContext(params);
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }

  async onRequestService(payload: ServiceBookingPayload): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    if (!payload.serviceId) {
      await this.presentToast('Unable to place booking: service ID is missing.', 'danger');
      return;
    }

    if (!payload.addressId || !payload.timeSlotId) {
      await this.presentToast('Please select a valid address and time slot.', 'danger');
      return;
    }

    if (!this.isValidBookingDate(payload.dateIso)) {
      await this.presentToast('Please choose a valid date (today or later).', 'danger');
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      await this.presentToast('Invalid service price. Please try again.', 'danger');
      return;
    }

    this.isSubmitting = true;
    try {
      await firstValueFrom(
        this.bookingService.createBooking({
          serviceId: payload.serviceId,
          addressId: payload.addressId,
          date: payload.dateIso,
          timeSlot: payload.timeSlotId,
          price: payload.price,
          phone: payload.phone,
          notes: payload.notes,
        }),
      );

      if (payload.phone !== this.userPhone) {
        this.authService.updateLocalPhone(payload.phone);
      }

      await this.presentToast('Booking request submitted successfully.', 'success');
    } catch (error) {
      await this.presentToast(this.extractErrorMessage(error), 'danger');
    } finally {
      this.isSubmitting = false;
    }
  }

  private async resolveServiceContext(params: Params): Promise<void> {
    const serviceFromState = this.readServiceFromNavigationState();
    if (serviceFromState) {
      this.applyServiceData(serviceFromState);
      return;
    }

    const serviceId = this.asStringOrNull(params['serviceId']);
    const serviceSlug = this.asStringOrNull(params['slug']);

    if (serviceId || serviceSlug) {
      this.isServiceLoading = true;
      try {
        const service = await firstValueFrom(
          this.catalogService.findServiceInCatalog(serviceId, serviceSlug),
        );
        if (service) {
          this.applyServiceData(service);
          return;
        }
      } catch {
        // Keep query-param fallback below.
      } finally {
        this.isServiceLoading = false;
      }
    }

    this.selectedService = null;
    const serviceNameFromQuery = this.asStringOrNull(params['service']);

    if (serviceNameFromQuery) {
      try {
        const serviceByTitle = await firstValueFrom(
          this.catalogService.findServiceByTitle(serviceNameFromQuery),
        );

        if (serviceByTitle) {
          this.applyServiceData(serviceByTitle);
          return;
        }
      } catch {
        // Keep fallback below.
      }
    }

    this.serviceName = serviceNameFromQuery ?? 'Service Booking';
    this.startingPrice = this.parsePrice(params['price']);
  }

  private readServiceFromNavigationState(): CatalogServiceItem | null {
    const currentNavigationState = this.router.getCurrentNavigation()?.extras?.state?.['service'];
    if (this.isCatalogServiceItem(currentNavigationState)) {
      return currentNavigationState;
    }

    const historyStateService = history.state?.['service'];
    if (this.isCatalogServiceItem(historyStateService)) {
      return historyStateService;
    }

    return null;
  }

  private applyServiceData(service: CatalogServiceItem): void {
    this.selectedService = service;
    this.serviceName = service.title || 'Service Booking';
    this.startingPrice = Number.isFinite(service.startingPrice) && service.startingPrice > 0
      ? service.startingPrice
      : this.parsePrice(service.priceText);
  }

  private isCatalogServiceItem(value: unknown): value is CatalogServiceItem {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<CatalogServiceItem>;
    return typeof candidate.id === 'string' && typeof candidate.title === 'string';
  }

  private asStringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private parsePrice(priceParam: unknown): number {
    if (typeof priceParam === 'number' && Number.isFinite(priceParam)) {
      return priceParam;
    }

    if (typeof priceParam === 'string') {
      const numericPrice = Number(priceParam.replace(/[^\d]/g, ''));
      if (Number.isFinite(numericPrice) && numericPrice > 0) {
        return numericPrice;
      }
    }

    return 299;
  }

  private isValidBookingDate(dateIso: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return false;
    }

    const [year, month, day] = dateIso.split('-').map((part) => Number(part));
    const selectedDate = new Date(year, month - 1, day);
    if (
      selectedDate.getFullYear() !== year ||
      selectedDate.getMonth() !== month - 1 ||
      selectedDate.getDate() !== day
    ) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const errorBody = error.error as Record<string, unknown> | string | null;
      if (typeof errorBody === 'string' && errorBody.trim()) {
        return errorBody;
      }

      if (errorBody && typeof errorBody === 'object') {
        const message = errorBody['message'];
        if (typeof message === 'string' && message.trim()) {
          return message;
        }

        const errorText = errorBody['error'];
        if (typeof errorText === 'string' && errorText.trim()) {
          return errorText;
        }
      }

      return `Booking failed (${error.status || 'network error'}). Please try again.`;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Booking failed. Please try again.';
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  private mapAddressesToOptions(
    addresses: Array<{ id: string; label: string; fullAddress: string; isDefault?: boolean }> | undefined,
  ): AddressOption[] {
    if (!addresses?.length) {
      return [];
    }

    return addresses
      .filter((address) => Boolean(address.id && address.fullAddress))
      .map((address) => ({
        id: address.id,
        label: address.label || 'Address',
        fullAddress: address.fullAddress,
        isDefault: Boolean(address.isDefault),
      }));
  }
}
