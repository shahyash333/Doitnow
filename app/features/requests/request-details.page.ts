import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  callOutline,
  chatbubbleOutline,
  chevronBackOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  star,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { BookingRequestDetailsItem, BookingService } from '../../core/services/booking.service';

type RequestStatus = 'pending' | 'approved' | 'completed' | 'cancelled';

interface RequestDetailsView {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  statusLabel: string;
  timeLabel: string;
  addressLabel: string;
  worker: {
    name: string;
    rating: string;
    phone: string | null;
    avatarText: string;
  } | null;
  cancellationReason: string | null;
  cancellationDescription: string | null;
}

@Component({
  selector: 'app-request-details',
  templateUrl: './request-details.page.html',
  styleUrls: ['./request-details.page.scss'],
})
export class RequestDetailsPage {
  isLoading = true;
  loadError = '';
  details: RequestDetailsView | null = null;
  isContactModalOpen = false;
  contactModalMode: 'call' | 'sms' = 'call';

  readonly icons = {
    callOutline,
    chatbubbleOutline,
    chevronBackOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
    star,
  };

  constructor(
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly bookingService: BookingService,
  ) {
    addIcons(this.icons);
  }

  ionViewWillEnter(): void {
    void this.loadDetails();
  }

  goBack(): void {
    void this.router.navigate(['/home/requests']);
  }

  retryLoad(): void {
    void this.loadDetails();
  }

  get showWorkerSection(): boolean {
    return Boolean(this.details?.worker) && this.details?.status !== 'pending';
  }

  onCallWorker(): void {
    const phone = this.getWorkerPhone();
    if (!phone) {
      return;
    }

    if (this.isWebPlatform()) {
      this.contactModalMode = 'call';
      this.isContactModalOpen = true;
      return;
    }

    window.location.href = `tel:${phone}`;
  }

  onMessageWorker(): void {
    const phone = this.getWorkerPhone();
    if (!phone) {
      return;
    }

    if (this.isWebPlatform()) {
      this.contactModalMode = 'sms';
      this.isContactModalOpen = true;
      return;
    }

    window.location.href = `sms:${phone}`;
  }

  closeContactModal(): void {
    this.isContactModalOpen = false;
  }

  get contactModalTitle(): string {
    return this.contactModalMode === 'call' ? 'Call Partner' : 'Message Partner';
  }

  get contactModalMessage(): string {
    if (this.contactModalMode === 'call') {
      return 'Web browsers cannot always open the phone dialer directly. Please use this number to call your assigned partner.';
    }

    return 'Web browsers cannot always open SMS apps directly. Please use this number to message your assigned partner.';
  }

  get progressSteps(): Array<{ label: string; state: 'done' | 'active' | 'upcoming' }> {
    const status = this.details?.status;

    if (status === 'cancelled') {
      return [
        { label: 'Request Submitted', state: 'done' },
        { label: this.details?.cancellationReason || 'Cancelled', state: 'active' },
      ];
    }

    if (status === 'completed') {
      return [
        { label: 'Request Submitted', state: 'done' },
        { label: 'Approved', state: 'done' },
        { label: 'Worker On the Way', state: 'done' },
        { label: 'Completed', state: 'active' },
      ];
    }

    if (status === 'approved') {
      return [
        { label: 'Request Submitted', state: 'done' },
        { label: 'Approved', state: 'active' },
        { label: 'Worker On the Way', state: 'upcoming' },
        { label: 'Completed', state: 'upcoming' },
      ];
    }

    return [
      { label: 'Request Submitted', state: 'active' },
      { label: 'Approved', state: 'upcoming' },
      { label: 'Worker On the Way', state: 'upcoming' },
      { label: 'Completed', state: 'upcoming' },
    ];
  }

  private async loadDetails(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const requestId = this.activatedRoute.snapshot.paramMap.get('requestId');
      if (!requestId) {
        this.loadError = 'Request not found.';
        return;
      }

      const response = await firstValueFrom(this.bookingService.getBookingRequestDetails(requestId));
      const request = response.data;

      if (!request?.requestId) {
        this.loadError = 'Request not found.';
        return;
      }

      this.details = this.mapApiToDetails(request);
    } catch {
      this.loadError = 'Unable to load request details right now. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  private mapApiToDetails(request: BookingRequestDetailsItem): RequestDetailsView {
    const normalizedStatus = (request.status ?? '').toUpperCase();
    const status = this.mapStatus(normalizedStatus);
    const workerName = request.assignedWorker?.name?.trim() || '';
    const cancellationReason = this.getCancellationReason(normalizedStatus);
    const cancellationDescription = this.normalizeDescription(request.rejectionReason) ?? this.normalizeDescription(request.description);

    return {
      id: request.requestId,
      title: request.serviceName || 'Service Request',
      description: request.description?.trim() || 'No description provided.',
      status,
      statusLabel: this.toTitleCase(normalizedStatus || status),
      timeLabel: this.formatScheduledTime(request.scheduledAt),
      addressLabel: request.address?.fullAddress?.trim() || 'Address details not available.',
      worker: workerName
        ? {
            name: workerName,
            rating:
              typeof request.assignedWorker?.rating === 'number'
                ? request.assignedWorker.rating.toFixed(1)
                : 'N/A',
            phone: this.normalizePhone(request.assignedWorker?.phone),
            avatarText: workerName.charAt(0).toUpperCase(),
          }
        : null,
      cancellationReason,
      cancellationDescription,
    };
  }

  private mapStatus(status: string): RequestStatus {
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

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private formatScheduledTime(scheduledAt: string | null): string {
    if (!scheduledAt) {
      return 'Time not available';
    }

    const date = new Date(scheduledAt);
    if (Number.isNaN(date.getTime())) {
      return 'Time not available';
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private getCancellationReason(status: string): string | null {
    if (status === 'CANCELLED_BY_ADMIN') {
      return 'Cancelled by Admin';
    }

    if (status === 'CANCELLED_BY_USER' || status === 'CANCELLLED_BY_USER') {
      return 'Cancelled by User';
    }

    if (status === 'CANCELLED') {
      return 'Cancelled';
    }

    return null;
  }

  private normalizeDescription(description: string | null | undefined): string | null {
    const value = description?.trim();
    return value ? value : null;
  }

  private getWorkerPhone(): string | null {
    return this.details?.worker?.phone ?? null;
  }

  private normalizePhone(phone: string | null | undefined): string | null {
    const value = phone?.trim();
    if (!value) {
      return null;
    }

    // Preserve leading + for international numbers, drop other non-digits.
    const normalized = value.startsWith('+')
      ? `+${value.slice(1).replace(/\D/g, '')}`
      : value.replace(/\D/g, '');

    return normalized || null;
  }

  private isWebPlatform(): boolean {
    return Capacitor.getPlatform() === 'web';
  }
}
