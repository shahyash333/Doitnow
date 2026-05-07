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

export interface BookingRequestItem {
  requestId: string;
  status: string;
  serviceName: string;
  description: string | null;
}

export interface BookingRequestsResponse {
  message: string;
  data: BookingRequestItem[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    filter: 'all' | 'pending' | 'approved' | 'completed';
  };
}

export interface BookingRequestsQueryParams {
  filter?: 'all' | 'pending' | 'approved' | 'completed';
  page?: number;
  limit?: number;
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

  getBookingRequests(params?: BookingRequestsQueryParams): Observable<BookingRequestsResponse> {
    const queryParams: Record<string, string> = {};
    if (params?.filter) {
      queryParams['filter'] = params.filter;
    }
    if (typeof params?.page === 'number') {
      queryParams['page'] = String(params.page);
    }
    if (typeof params?.limit === 'number') {
      queryParams['limit'] = String(params.limit);
    }

    return this.http.get<BookingRequestsResponse>(`${environment.apiUrl}/booking/requests`, {
      params: queryParams,
    });
  }
}
