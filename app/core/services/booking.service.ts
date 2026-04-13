import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseService } from './base.service';

export interface CreateBookingRequest {
  serviceId: string;
  addressId: string;
  date: string;
  timeSlot: string;
  price: number;
  phone: string;
  notes?: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookingService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  createBooking(payload: CreateBookingRequest): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/booking`, payload);
  }
}
