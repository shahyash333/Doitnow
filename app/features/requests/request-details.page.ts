import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  callOutline,
  chatbubbleOutline,
  chevronBackOutline,
  checkmarkCircleOutline,
  star,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { BookingRequestItem, BookingService } from '../../core/services/booking.service';

type RequestStatus = 'pending' | 'approved' | 'completed';

interface RequestDetailsView {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  statusLabel: string;
  timeLabel: string;
  addressLabel: string;
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

  readonly icons = {
    callOutline,
    chatbubbleOutline,
    chevronBackOutline,
    checkmarkCircleOutline,
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

  get isApproved(): boolean {
    return this.details?.status === 'approved';
  }

  get progressSteps(): Array<{ label: string; state: 'done' | 'active' | 'upcoming' }> {
    const status = this.details?.status;

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

      const stateRequest = history.state?.['request'] as RequestDetailsView | undefined;
      if (stateRequest?.id === requestId) {
        this.details = stateRequest;
        return;
      }

      const response = await firstValueFrom(this.bookingService.getBookingRequests());
      const request = (response.data ?? []).find((item) => item.requestId === requestId);

      if (!request) {
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

  private mapApiToDetails(request: BookingRequestItem): RequestDetailsView {
    const normalizedStatus = (request.status ?? '').toUpperCase();
    const status = this.mapStatus(normalizedStatus);

    return {
      id: request.requestId,
      title: request.serviceName || 'Service Request',
      description: request.description?.trim() || 'No description provided.',
      status,
      statusLabel: this.toTitleCase(normalizedStatus || status),
      timeLabel: 'Today, 4:00 PM',
      addressLabel: 'Address will be shared once worker is assigned.',
    };
  }

  private mapStatus(status: string): RequestStatus {
    if (status === 'PENDING') {
      return 'pending';
    }

    if (status === 'COMPLETED') {
      return 'completed';
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
}
