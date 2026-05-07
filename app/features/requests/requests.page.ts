import { Component } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  buildOutline,
  carOutline,
  checkmarkCircleOutline,
  medicalOutline,
  sparklesOutline,
  starOutline,
  timeOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { BookingRequestItem, BookingService } from '../../core/services/booking.service';

interface Request {
  id: string;
  title: string;
  description: string;
  icon: keyof RequestsPage['icons'];
  colorClass: string;
  status: 'pending' | 'approved' | 'completed';
  statusLabel: string;
  statusIcon: keyof RequestsPage['icons'];
}

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
})
export class RequestsPage {
  activeTab: string = 'all';
  isLoading = false;
  loadError = '';
  readonly skeletonCards = Array.from({ length: 3 });

  readonly icons = {
    buildOutline,
    carOutline,
    checkmarkCircleOutline,
    medicalOutline,
    sparklesOutline,
    starOutline,
    timeOutline,
  };

  requests: Request[] = [];

  get filteredRequests(): Request[] {
    if (this.activeTab === 'all') {
      return this.requests;
    }
    return this.requests.filter((req) => req.status === this.activeTab);
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  constructor(
    private readonly router: Router,
    private readonly bookingService: BookingService,
    private readonly toastController: ToastController,
  ) {
    addIcons(this.icons);
  }

  ionViewWillEnter(): void {
    void this.maybeShowBookingSuccessToast();
    void this.loadRequests();
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

  performAction(request: Request): void {
    console.log('Action for:', request);
    // Handle cancel or rebook
  }

  retryLoad(): void {
    void this.loadRequests();
  }

  private async loadRequests(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const response = await firstValueFrom(this.bookingService.getBookingRequests());
      this.requests = (response.data ?? []).map((request) => this.mapApiRequestToUi(request));
    } catch (error: unknown) {
      this.requests = [];

      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.loadError = 'Your session has expired. Please login again.';
      } else {
        this.loadError = 'Unable to load requests right now. Please try again.';
      }
    } finally {
      this.isLoading = false;
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
      statusIcon: status === 'pending' ? 'timeOutline' : status === 'completed' ? 'starOutline' : 'checkmarkCircleOutline',
    };
  }

  private mapStatus(status: string): Request['status'] {
    if (status === 'PENDING') {
      return 'pending';
    }

    if (status === 'COMPLETED') {
      return 'completed';
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
}
