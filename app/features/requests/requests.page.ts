import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AlertController, InfiniteScrollCustomEvent, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  buildOutline,
  carOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  medicalOutline,
  sparklesOutline,
  starOutline,
  timeOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import {
  BookingRequestItem,
  BookingRequestsQueryParams,
  BookingService,
} from '../../core/services/booking.service';
import { NotificationsService } from '../../core/services/notifications.service';

type RequestFilter = 'all' | 'pending' | 'approved' | 'completed';

interface Request {
  id: string;
  title: string;
  description: string;
  icon: keyof RequestsPage['icons'];
  colorClass: string;
  status: 'pending' | 'approved' | 'completed' | 'cancelled';
  statusLabel: string;
  statusIcon: keyof RequestsPage['icons'];
}

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
})
export class RequestsPage {
  activeTab: RequestFilter = 'all';
  isInitialLoading = false;
  isLoadingMore = false;
  hasMore = true;
  loadError = '';
  readonly skeletonCards = Array.from({ length: 4 });
  private readonly pageSize = 10;
  private currentPage = 1;
  private latestLoadRequestId = 0;
  private cancellingRequestId: string | null = null;

  readonly icons = {
    buildOutline,
    carOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
    medicalOutline,
    sparklesOutline,
    starOutline,
    timeOutline,
  };

  requests: Request[] = [];

  get emptyStateText(): string {
    if (this.activeTab === 'all') {
      return 'No bookings yet.';
    }
    return `No ${this.activeTab} bookings yet.`;
  }

  selectTab(tab: RequestFilter): void {
    if (this.activeTab === tab && this.requests.length > 0) {
      return;
    }

    this.activeTab = tab;
    void this.loadRequests({ reset: true });
  }

  constructor(
    private readonly router: Router,
    private readonly bookingService: BookingService,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController,
    private readonly notificationsService: NotificationsService,
  ) {
    addIcons(this.icons);
  }

  ionViewWillEnter(): void {
    void this.maybeShowBookingSuccessToast();
    void this.loadRequests({ reset: true });
  }

  viewDetails(request: Request): void {
    this.router.navigate(['/home/requests', request.id], {
      state: {
        request: {
          id: request.id,
          title: request.title,
          description: request.description,
          status: request.status,
          statusLabel: request.statusLabel,
          timeLabel: 'Today, 4:00 PM',
          addressLabel: 'Address will be shared once worker is assigned.',
        },
      },
    });
  }

  get isCancellingAnyRequest(): boolean {
    return Boolean(this.cancellingRequestId);
  }

  isCancellingRequest(requestId: string): boolean {
    return this.cancellingRequestId === requestId;
  }

  async performAction(request: Request): Promise<void> {
    if (request.status !== 'pending' || this.cancellingRequestId) {
      return;
    }

    await this.openCancelConfirmation(request);
  }

  retryLoad(): void {
    void this.loadRequests({ reset: true });
  }

  async onLoadMore(event: Event): Promise<void> {
    if (!this.hasMore || this.isInitialLoading || this.isLoadingMore) {
      (event as InfiniteScrollCustomEvent).target.complete();
      return;
    }

    await this.loadRequests({
      reset: false,
      infiniteEvent: event as InfiniteScrollCustomEvent,
    });
  }

  private async loadRequests(options: { reset: boolean; infiniteEvent?: InfiniteScrollCustomEvent }): Promise<void> {
    const { reset, infiniteEvent } = options;
    const requestId = ++this.latestLoadRequestId;

    if (reset) {
      this.isInitialLoading = true;
      this.currentPage = 1;
      this.hasMore = true;
      this.requests = [];
      this.loadError = '';
    } else {
      this.isLoadingMore = true;
    }

    const query: BookingRequestsQueryParams = {
      filter: this.activeTab,
      page: this.currentPage,
      limit: this.pageSize,
    };

    try {
      const response = await firstValueFrom(this.bookingService.getBookingRequests(query));

      if (requestId !== this.latestLoadRequestId) {
        return;
      }

      const pageItems = (response.data ?? []).map((request) => this.mapApiRequestToUi(request));
      this.requests = reset ? pageItems : [...this.requests, ...pageItems];

      const totalPages = response.meta?.totalPages ?? this.currentPage;
      this.hasMore = this.currentPage < totalPages && pageItems.length > 0;
      this.currentPage += 1;
    } catch (error: unknown) {
      if (requestId !== this.latestLoadRequestId) {
        return;
      }

      if (reset) {
        this.requests = [];
      }

      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.loadError = 'Your session has expired. Please login again.';
      } else {
        this.loadError = 'Unable to load requests right now. Please try again.';
      }
    } finally {
      if (requestId === this.latestLoadRequestId) {
        this.isInitialLoading = false;
        this.isLoadingMore = false;
      }
      infiniteEvent?.target.complete();
    }
  }

  private mapApiRequestToUi(request: BookingRequestItem): Request {
    const normalizedStatus = (request.status ?? '').toUpperCase();
    const status = this.mapStatus(normalizedStatus);

    return {
      id: request.requestId,
      title: request.serviceName || 'Service Request',
      description: request.description?.trim() || 'No description provided.',
      icon: this.mapIcon(request.serviceName),
      colorClass: this.mapColorClass(request.serviceName),
      status,
      statusLabel: this.toTitleCase(normalizedStatus || status),
      statusIcon:
        status === 'pending'
          ? 'timeOutline'
          : status === 'completed'
            ? 'starOutline'
            : status === 'cancelled'
              ? 'closeCircleOutline'
              : 'checkmarkCircleOutline',
    };
  }

  private mapStatus(status: string): Request['status'] {
    if (status === 'PENDING') {
      return 'pending';
    }

    if (status === 'COMPLETED') {
      return 'completed';
    }

    if (
      status === 'CANCELLED' ||
      status === 'CANCELLED_BY_ADMIN' ||
      status === 'CANCELLED_BY_USER' ||
      status === 'CANCELLLED_BY_USER'
    ) {
      return 'cancelled';
    }

    return 'approved';
  }

  private mapIcon(serviceName: string): Request['icon'] {
    const value = (serviceName ?? '').toLowerCase();

    if (value.includes('medical') || value.includes('medicine') || value.includes('pharmacy')) {
      return 'medicalOutline';
    }

    if (value.includes('car')) {
      return 'carOutline';
    }

    if (value.includes('clean')) {
      return 'sparklesOutline';
    }

    return 'buildOutline';
  }

  private mapColorClass(serviceName: string): string {
    const value = (serviceName ?? '').toLowerCase();

    if (value.includes('medical') || value.includes('medicine') || value.includes('pharmacy')) {
      return 'mint';
    }

    if (value.includes('car')) {
      return 'sand';
    }

    if (value.includes('clean')) {
      return 'sky';
    }

    return 'peach';
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async maybeShowBookingSuccessToast(): Promise<void> {
    const message = sessionStorage.getItem('bookingSuccessToast');
    if (!message) {
      return;
    }

    sessionStorage.removeItem('bookingSuccessToast');
    const toast = await this.toastController.create({
      message,
      duration: 2400,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }

  private async openCancelConfirmation(request: Request): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Cancel this request?',
      subHeader: 'This action cannot be undone.',
      message: 'You can optionally share a reason for cancellation.',
      cssClass: 'cancel-request-alert',
      inputs: [
        {
          name: 'reason',
          type: 'textarea',
          placeholder: 'Optional reason (max 500 characters)',
          attributes: {
            maxlength: 500,
          },
        },
      ],
      buttons: [
        {
          text: 'Keep Request',
          role: 'cancel',
        },
        {
          text: 'Cancel Request',
          role: 'destructive',
          handler: (data: { reason?: string }) => {
            void this.confirmCancelRequest(request.id, data.reason);
          },
        },
      ],
    });

    await alert.present();
  }

  private async confirmCancelRequest(requestId: string, reason?: string): Promise<void> {
    const trimmedReason = reason?.trim() ?? '';
    const payload = trimmedReason ? { reason: trimmedReason } : {};

    this.cancellingRequestId = requestId;

    try {
      const response = await firstValueFrom(this.bookingService.cancelBookingRequest(requestId, payload));
      const normalizedStatus = (response.data?.status ?? 'CANCELLED_BY_USER').toUpperCase();
      const status = this.mapStatus(normalizedStatus);
      const statusLabel = this.toTitleCase(normalizedStatus);

      this.requests = this.requests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              statusLabel,
              statusIcon: 'closeCircleOutline',
            }
          : request,
      );
      const cancelledRequest = this.requests.find((request) => request.id === requestId);
      this.notificationsService.addLocalBookingStatusNotification({
        bookingId: requestId,
        status: normalizedStatus,
        serviceName: cancelledRequest?.title ?? null,
        rejectionReason: response.data?.rejectionReason ?? null,
      });

      const toast = await this.toastController.create({
        message: response.message || 'Request cancelled successfully.',
        duration: 2200,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();

      if (this.activeTab !== 'all' && this.activeTab !== 'pending') {
        void this.loadRequests({ reset: true });
      }
    } catch (error: unknown) {
      const message =
        error instanceof HttpErrorResponse
          ? error.error?.message || 'Unable to cancel request right now.'
          : 'Unable to cancel request right now.';
      const toast = await this.toastController.create({
        message,
        duration: 2400,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.cancellingRequestId = null;
    }
  }
}
