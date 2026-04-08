import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { ServiceBookingPayload } from '../../shared/components/service-booking-form/service-booking-form.component';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
})
export class BookingPage {
  serviceName = 'Home Cleaning';
  startingPrice = 299;

  constructor(
    private readonly activatedRoute: ActivatedRoute,
    private readonly toastController: ToastController,
  ) {
    this.activatedRoute.queryParams.subscribe((params) => {
      this.serviceName = (params['service'] as string) || 'Home Cleaning';
      this.startingPrice = this.parsePrice(params['price']);
    });
  }

  async onRequestService(payload: ServiceBookingPayload): Promise<void> {
    const noteSuffix = payload.note ? ` Note: ${payload.note}` : '';
    const toast = await this.toastController.create({
      message: `Request sent for ${payload.serviceName} on ${payload.dateLabel} (${payload.timeSlotLabel}).${noteSuffix}`,
      duration: 2200,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
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
}
