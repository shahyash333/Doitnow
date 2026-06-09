import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseService } from './base.service';

export interface SupportFaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder?: number;
}

export interface SupportContent {
  supportEmail: string;
  faqs: SupportFaqItem[];
}

export interface SupportContentResponse {
  message: string;
  data: SupportContent;
}

@Injectable({
  providedIn: 'root',
})
export class SupportService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getSupportContent(): Observable<SupportContentResponse> {
    return this.http.get<SupportContentResponse>(`${environment.apiUrl}/support`);
  }
}
