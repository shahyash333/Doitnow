import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BaseService } from './base.service';

export interface ProfileSummary {
  completedCount: number;
  pendingCount: number;
  rating: number | null;
  totalRequests: number;
}

export interface ProfileSummaryResponse {
  message: string;
  data: ProfileSummary;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getProfileSummary(): Observable<ProfileSummaryResponse> {
    return this.http.get<ProfileSummaryResponse>(`${environment.apiUrl}/users/profile-summary`);
  }
}
