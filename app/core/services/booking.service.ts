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
  selectedAddonIds?: string[];
}

export interface BookingRequestItem {
  requestId: string;
  status: string;
  serviceName: string;
  description: string | null;
  rejectionReason?: string | null;
}

export interface BookingRequestDetailsWorker {
  id: string;
  name: string;
  rating: number | null;
  avatarUrl: string | null;
  phone: string | null;
}

export interface BookingRequestDetailsAddress {
  fullAddress: string | null;
}

export interface BookingRequestDetailsItem {
  requestId: string;
  status: string;
  serviceName: string;
  description: string | null;
  rejectionReason?: string | null;
  scheduledAt: string | null;
  address: BookingRequestDetailsAddress | null;
  assignedWorker: BookingRequestDetailsWorker | null;
}

export interface BookingRequestDetailsResponse {
  message: string;
  data: BookingRequestDetailsItem;
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

export interface CancelBookingRequestPayload {
  reason?: string;
}

export interface CancelBookingRequestResponse {
  message: string;
  data: {
    requestId: string;
    status: string;
    rejectionReason: string | null;
    cancelledAt: string;
  };
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

  getBookingRequestDetails(requestId: string): Observable<BookingRequestDetailsResponse> {
    return this.http.get<BookingRequestDetailsResponse>(`${environment.apiUrl}/booking/requests/${requestId}`);
  }

  cancelBookingRequest(
    requestId: string,
    payload: CancelBookingRequestPayload,
  ): Observable<CancelBookingRequestResponse> {
    return this.http.patch<CancelBookingRequestResponse>(
      `${environment.apiUrl}/booking/requests/${requestId}/cancel`,
      payload,
    );
  }
}
