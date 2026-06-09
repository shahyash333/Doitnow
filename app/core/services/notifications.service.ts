import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from '@capacitor/push-notifications';

import { environment } from '../../../environments/environment';
import { BookingRequestItem, BookingService } from './booking.service';

type BookingPushStatus = 'CONFIRMED' | 'CANCELLED_BY_ADMIN' | 'COMPLETED' | string;

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  createdAt: string;
  isUnread: boolean;
  icon: 'checkmarkCircleOutline' | 'personOutline' | 'timeOutline';
  colorClass: 'mint' | 'lavender' | 'amber' | 'rose';
  requestId: string | null;
  status: string | null;
}

interface NotificationsApiItem {
  id?: string;
  _id?: string;
  type?: string;
  title?: string;
  message?: string;
  description?: string;
  body?: string;
  status?: string;
  bookingId?: string;
  requestId?: string;
  orderId?: string;
  referenceId?: string;
  booking?: string | { id?: string; _id?: string; requestId?: string };
  payload?: string | Record<string, unknown>;
  data?: string | Record<string, unknown>;
  metadata?: string | Record<string, unknown>;
  isRead?: boolean;
  read?: boolean;
  createdAt?: string;
  timestamp?: string;
}

interface NotificationsApiResponse {
  message?: string;
  data?: NotificationsApiItem[] | { notifications?: NotificationsApiItem[]; items?: NotificationsApiItem[] };
  meta?: {
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

interface BookingStatusPushData {
  type?: string;
  bookingId?: string;
  requestId?: string;
  userId?: string;
  status?: BookingPushStatus;
  serviceName?: string;
  rejectionReason?: string;
}

const DBG = '[DOITNOW_NOTIFY_DEBUG]';
const SYNC_INTERVAL_MS = 20000;

@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  private readonly notificationsStorageKey = 'app.notifications';
  private readonly fcmTokenStorageKey = 'app.fcm.token';
  private readonly syncedFcmTokenStorageKey = 'app.fcm.syncedToken';
  private readonly maxStoredNotifications = 120;
  private readonly requestStatusSnapshotStorageKey = 'app.notifications.requestStatusSnapshot';

  private readonly notificationsSubject = new BehaviorSubject<NotificationItem[]>(this.loadStoredNotifications());
  private hasInitializedPush = false;
  private isSyncInProgress = false;
  private lastSyncAt = 0;
  private hasAttemptedTokenSyncThisLaunch = false;
  private hasCreatedNotificationChannel = false;

  readonly notifications$ = this.notificationsSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
    private readonly bookingService: BookingService,
    private readonly toastController: ToastController,
  ) {}

  get unreadCount$(): Observable<number> {
    return new Observable<number>((subscriber) => {
      const subscription = this.notifications$.subscribe((notifications) => {
        subscriber.next(notifications.filter((item) => item.isUnread).length);
      });
      return () => subscription.unsubscribe();
    });
  }

  get notifications(): NotificationItem[] {
    return this.notificationsSubject.value;
  }

  async initializePushNotifications(): Promise<void> {
    console.log(`${DBG} initializePushNotifications:start`, {
      platform: Capacitor.getPlatform(),
      alreadyInitialized: this.hasInitializedPush,
      enabled: environment.enableNativePushNotifications,
    });

    if (!environment.enableNativePushNotifications) {
      console.log(`${DBG} initializePushNotifications:disabled_by_env`);
      return;
    }

    if (this.hasInitializedPush || Capacitor.getPlatform() === 'web') {
      console.log(`${DBG} initializePushNotifications:skipped`);
      return;
    }

    this.hasInitializedPush = true;

    try {
      await this.ensureAndroidNotificationChannel();
      console.log(`${DBG} initializePushNotifications:listeners_registering`);
      PushNotifications.addListener('registration', (token: Token) => {
        console.log(`${DBG} listener:registration`, { tokenLength: token.value?.length ?? 0 });
        void this.handleTokenRegistration(token);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error(`${DBG} listener:registrationError`, error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log(`${DBG} listener:pushNotificationReceived`, {
          title: notification.title,
          hasData: Boolean(notification.data),
        });
        this.handleIncomingPush(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log(`${DBG} listener:pushNotificationActionPerformed`, {
          hasData: Boolean(action.notification?.data),
        });
        this.handlePushAction(action);
      });

      console.log(`${DBG} initializePushNotifications:requestPermissions`);
      const permissionResult = await PushNotifications.requestPermissions();
      console.log(`${DBG} initializePushNotifications:permissionResult`, permissionResult);
      if (permissionResult.receive !== 'granted') {
        console.log(`${DBG} initializePushNotifications:permissionDenied`);
        return;
      }

      console.log(`${DBG} initializePushNotifications:register`);
      await PushNotifications.register();
      console.log(`${DBG} initializePushNotifications:register_called`);
    } catch (error) {
      console.error(`${DBG} initializePushNotifications:failed`, error);
    }
  }

  async syncInAppNotifications(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastSyncAt < SYNC_INTERVAL_MS) {
      console.log(`${DBG} syncInAppNotifications:skipped_throttled`, { lastSyncAt: this.lastSyncAt });
      return;
    }

    console.log(`${DBG} syncInAppNotifications:start`, { inProgress: this.isSyncInProgress });
    if (this.isSyncInProgress) {
      return;
    }

    this.isSyncInProgress = true;
    this.lastSyncAt = now;

    try {
      await this.refreshInboxFromServer();

      const snapshot = this.getStatusSnapshot();
      const response = await firstValueFrom(
        this.bookingService.getBookingRequests({
          filter: 'all',
          page: 1,
          limit: 50,
        }),
      );

      const requests = response.data ?? [];
      const nextSnapshot: Record<string, string> = {};
      const generated: NotificationItem[] = [];

      for (const request of requests) {
        const requestId = request.requestId;
        const currentStatus = (request.status ?? '').toUpperCase();
        if (!requestId || !currentStatus) {
          continue;
        }

        nextSnapshot[requestId] = currentStatus;

        const previousStatus = snapshot[requestId];
        if (!previousStatus || previousStatus === currentStatus) {
          continue;
        }

        if (!this.shouldGenerateStatusNotification(currentStatus)) {
          continue;
        }

        generated.push(this.createStatusNotificationFromRequest(request, currentStatus));
      }

      this.persistStatusSnapshot(nextSnapshot);

      if (generated.length > 0) {
        const nextNotifications = [...generated, ...this.notifications].slice(0, this.maxStoredNotifications);
        this.updateNotifications(nextNotifications);
      }
      console.log(`${DBG} syncInAppNotifications:done`, {
        totalRequests: requests.length,
        generated: generated.length,
      });
    } catch (error) {
      console.error(`${DBG} syncInAppNotifications:failed`, this.toErrorLog(error));
    } finally {
      this.isSyncInProgress = false;
    }
  }

  addLocalBookingStatusNotification(payload: {
    bookingId: string;
    status: string;
    serviceName?: string | null;
    rejectionReason?: string | null;
  }): void {
    const data: BookingStatusPushData = {
      type: 'BOOKING_STATUS_CHANGED',
      bookingId: payload.bookingId,
      status: payload.status,
      serviceName: payload.serviceName ?? undefined,
      rejectionReason: payload.rejectionReason ?? undefined,
    };

    const createdAt = new Date().toISOString();
    const notificationItem: NotificationItem = {
      id: `${createdAt}-${payload.bookingId}`,
      type: 'BOOKING_STATUS_CHANGED',
      title: this.resolvePushTitle(payload.status),
      description: this.resolvePushDescription(data),
      timestamp: this.formatRelativeTime(createdAt),
      createdAt,
      isUnread: true,
      icon: this.resolvePushIcon(payload.status),
      colorClass: this.resolvePushColor(payload.status),
      requestId: payload.bookingId,
      status: payload.status,
    };
    const nextNotifications = [notificationItem, ...this.notifications].slice(0, this.maxStoredNotifications);
    this.updateNotifications(nextNotifications);
  }

  markAllAsRead(): void {
    void this.markAllAsReadOnServer();
  }

  markAsRead(notificationId: string): void {
    void this.markSingleAsReadOnServer(notificationId);
  }

  async openNotification(
    notificationOrId: string | Pick<NotificationItem, 'id' | 'requestId'>,
  ): Promise<void> {
    const target =
      typeof notificationOrId === 'string'
        ? this.notifications.find((item) => item.id === notificationOrId)
        : notificationOrId;

    if (!target) {
      return;
    }

    this.markAsRead(target.id);

    const stored = this.notifications.find((item) => item.id === target.id);
    const requestId = this.resolveNotificationRequestId(stored ?? target);
    if (requestId) {
      await this.router.navigate(['/home/requests', requestId]);
      return;
    }

    console.warn(`${DBG} openNotification:missing_request_id`, { notificationId: target.id });
    await this.presentNavigationErrorToast();
  }

  clearAll(): void {
    this.updateNotifications([]);
    localStorage.removeItem(this.fcmTokenStorageKey);
    localStorage.removeItem(this.syncedFcmTokenStorageKey);
    localStorage.removeItem(this.requestStatusSnapshotStorageKey);
  }

  private handleIncomingPush(notification: PushNotificationSchema): void {
    const data = (notification.data ?? {}) as BookingStatusPushData;
    if (data.type !== 'BOOKING_STATUS_CHANGED') {
      return;
    }

    const createdAt = new Date().toISOString();
    const notificationItem: NotificationItem = {
      id: `${createdAt}-${data.bookingId ?? 'booking'}`,
      type: data.type,
      title: this.resolvePushTitle(data.status),
      description: this.resolvePushDescription(data),
      timestamp: this.formatRelativeTime(createdAt),
      createdAt,
      isUnread: true,
      icon: this.resolvePushIcon(data.status),
      colorClass: this.resolvePushColor(data.status),
      requestId: this.resolvePushRequestId(data),
      status: data.status ?? null,
    };

    const nextNotifications = [notificationItem, ...this.notifications].slice(0, this.maxStoredNotifications);
    this.updateNotifications(nextNotifications);
    void this.presentForegroundToast(notificationItem);
  }

  private resolvePushRequestId(data: BookingStatusPushData): string | null {
    const requestId = data.requestId?.trim() || data.bookingId?.trim();
    return requestId || null;
  }

  private shouldGenerateStatusNotification(status: string): boolean {
    return (
      status === 'CONFIRMED' ||
      status === 'CANCELLED_BY_ADMIN' ||
      status === 'CANCELLED_BY_USER' ||
      status === 'CANCELLLED_BY_USER' ||
      status === 'COMPLETED'
    );
  }

  private createStatusNotificationFromRequest(request: BookingRequestItem, status: string): NotificationItem {
    const data: BookingStatusPushData = {
      status,
      bookingId: request.requestId,
      serviceName: request.serviceName,
      rejectionReason: request.rejectionReason ?? undefined,
    };
    const createdAt = new Date().toISOString();

    return {
      id: `${createdAt}-${request.requestId}`,
      type: 'BOOKING_STATUS_CHANGED',
      title: this.resolvePushTitle(status),
      description: this.resolvePushDescription(data),
      timestamp: this.formatRelativeTime(createdAt),
      createdAt,
      isUnread: true,
      icon: this.resolvePushIcon(status),
      colorClass: this.resolvePushColor(status),
      requestId: request.requestId,
      status,
    };
  }

  private handlePushAction(action: ActionPerformed): void {
    const data = (action.notification?.data ?? {}) as BookingStatusPushData;
    const notificationId = this.findNotificationIdByBookingAndTime(data.bookingId);

    if (notificationId) {
      this.markAsRead(notificationId);
    }

    const requestId = this.resolvePushRequestId(data);
    if (requestId) {
      void this.router.navigate(['/home/requests', requestId]);
    }
  }

  private findNotificationIdByBookingAndTime(bookingId?: string): string | null {
    if (!bookingId) {
      return null;
    }

    const match = this.notifications.find((notification) => notification.requestId === bookingId);
    return match?.id ?? null;
  }

  private async handleTokenRegistration(token: Token): Promise<void> {
    console.log(`${DBG} handleTokenRegistration:start`);
    const fcmToken = token.value?.trim();
    if (!fcmToken) {
      console.log(`${DBG} handleTokenRegistration:empty_token`);
      return;
    }

    const tokenSuffix = fcmToken.slice(-8);
    console.log(`${DBG} handleTokenRegistration:token_suffix`, { tokenSuffix });

    const previousToken = localStorage.getItem(this.fcmTokenStorageKey);
    localStorage.setItem(this.fcmTokenStorageKey, fcmToken);

    const syncedToken = localStorage.getItem(this.syncedFcmTokenStorageKey);
    const isAlreadySynced = fcmToken === previousToken && fcmToken === syncedToken;
    if (isAlreadySynced && this.hasAttemptedTokenSyncThisLaunch) {
      console.log(`${DBG} handleTokenRegistration:already_synced`);
      return;
    }

    this.hasAttemptedTokenSyncThisLaunch = true;

    try {
      await firstValueFrom(
        this.http.patch(`${environment.apiUrl}/users/fcm-token`, {
          fcmToken,
          platform: this.resolvePlatform(),
        }),
      );
      localStorage.setItem(this.syncedFcmTokenStorageKey, fcmToken);
      console.log(`${DBG} handleTokenRegistration:synced`, { tokenSuffix });
    } catch (error) {
      console.error(`${DBG} handleTokenRegistration:sync_failed`, error);
    }
  }

  private updateNotifications(next: NotificationItem[]): void {
    const normalized = next.map((item) => ({
      ...item,
      timestamp: this.formatRelativeTime(item.createdAt),
    }));
    this.notificationsSubject.next(normalized);
    localStorage.setItem(this.notificationsStorageKey, JSON.stringify(normalized));
  }

  private loadStoredNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(this.notificationsStorageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as NotificationItem[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item) => item && typeof item.id === 'string')
        .map((item) => ({
          ...item,
          timestamp: this.formatRelativeTime(item.createdAt),
        }))
        .slice(0, this.maxStoredNotifications);
    } catch {
      return [];
    }
  }

  private resolvePushTitle(status?: string): string {
    if (status === 'CONFIRMED') {
      return 'Request Approved';
    }

    if (status === 'CANCELLED_BY_ADMIN') {
      return 'Request Rejected';
    }

    if (status === 'CANCELLED_BY_USER' || status === 'CANCELLLED_BY_USER') {
      return 'Request Cancelled';
    }

    if (status === 'COMPLETED') {
      return 'Service Completed';
    }

    return 'Request Updated';
  }

  private resolvePushDescription(data: BookingStatusPushData): string {
    const serviceName = data.serviceName?.trim() || 'your request';

    if (data.status === 'CONFIRMED') {
      return `${serviceName} was approved by admin.`;
    }

    if (data.status === 'CANCELLED_BY_ADMIN') {
      const reason = data.rejectionReason?.trim();
      return reason ? `${serviceName} was rejected. Reason: ${reason}` : `${serviceName} was rejected by admin.`;
    }

    if (data.status === 'CANCELLED_BY_USER' || data.status === 'CANCELLLED_BY_USER') {
      const reason = data.rejectionReason?.trim();
      return reason ? `${serviceName} was cancelled. Reason: ${reason}` : `${serviceName} was cancelled.`;
    }

    if (data.status === 'COMPLETED') {
      return `${serviceName} was marked as completed.`;
    }

    return `${serviceName} status changed to ${data.status ?? 'updated'}.`;
  }

  private resolvePushIcon(status?: string): NotificationItem['icon'] {
    if (status === 'COMPLETED') {
      return 'timeOutline';
    }

    if (status === 'CANCELLED_BY_ADMIN') {
      return 'personOutline';
    }

    if (status === 'CANCELLED_BY_USER' || status === 'CANCELLLED_BY_USER') {
      return 'personOutline';
    }

    return 'checkmarkCircleOutline';
  }

  private resolvePushColor(status?: string): NotificationItem['colorClass'] {
    if (status === 'COMPLETED') {
      return 'amber';
    }

    if (status === 'CANCELLED_BY_ADMIN') {
      return 'rose';
    }

    if (status === 'CANCELLED_BY_USER' || status === 'CANCELLLED_BY_USER') {
      return 'rose';
    }

    if (status === 'CONFIRMED') {
      return 'mint';
    }

    return 'lavender';
  }

  private formatRelativeTime(isoDate: string): string {
    const createdAt = new Date(isoDate).getTime();
    if (Number.isNaN(createdAt)) {
      return 'Just now';
    }

    const diffMs = Date.now() - createdAt;
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) {
      return 'Just now';
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days === 1) {
      return 'Yesterday';
    }

    if (days < 7) {
      return `${days}d ago`;
    }

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  private getStatusSnapshot(): Record<string, string> {
    const raw = localStorage.getItem(this.requestStatusSnapshotStorageKey);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private persistStatusSnapshot(snapshot: Record<string, string>): void {
    localStorage.setItem(this.requestStatusSnapshotStorageKey, JSON.stringify(snapshot));
  }

  private toErrorLog(error: unknown): unknown {
    if (!error || typeof error !== 'object') {
      return error;
    }

    const source = error as {
      status?: number;
      message?: string;
      url?: string;
      error?: unknown;
      name?: string;
    };

    return {
      name: source.name,
      status: source.status,
      message: source.message,
      url: source.url,
      error: source.error,
    };
  }

  private resolvePlatform(): 'ANDROID' | 'IOS' | 'WEB' | 'UNKNOWN' {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'ANDROID';
    }
    if (platform === 'ios') {
      return 'IOS';
    }
    if (platform === 'web') {
      return 'WEB';
    }
    return 'UNKNOWN';
  }

  private async ensureAndroidNotificationChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android' || this.hasCreatedNotificationChannel) {
      return;
    }

    try {
      await PushNotifications.createChannel({
        id: 'high_priority',
        name: 'High Priority Notifications',
        description: 'Booking status updates and important alerts',
        importance: 5,
        visibility: 1,
      });
      this.hasCreatedNotificationChannel = true;
      console.log(`${DBG} ensureAndroidNotificationChannel:created`);
    } catch (error) {
      console.error(`${DBG} ensureAndroidNotificationChannel:failed`, this.toErrorLog(error));
    }
  }

  private async refreshInboxFromServer(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<NotificationsApiResponse>(`${environment.apiUrl}/notifications`, {
          params: {
            page: '1',
            limit: '20',
          },
        }),
      );
      const responseData = response.data;
      const dataObject = responseData && !Array.isArray(responseData) ? responseData : null;

      const rawList: NotificationsApiItem[] = Array.isArray(responseData)
        ? responseData
        : Array.isArray(dataObject?.notifications)
          ? dataObject.notifications
          : Array.isArray(dataObject?.items)
            ? dataObject.items
            : [];

      console.log(`${DBG} refreshInboxFromServer:response_shape`, {
        hasArrayData: Array.isArray(responseData),
        notificationsCount: Array.isArray(dataObject?.notifications) ? dataObject.notifications.length : null,
        itemsCount: Array.isArray(dataObject?.items) ? dataObject.items.length : null,
        rawCount: rawList.length,
      });

      const mapped = rawList
        .map((item) => this.mapApiNotificationToUi(item))
        .filter((item): item is NotificationItem => item !== null);

      const merged = this.mergeNotifications(mapped, this.notifications);
      this.updateNotifications(merged.slice(0, this.maxStoredNotifications));
    } catch (error) {
      console.error(`${DBG} refreshInboxFromServer:failed`, this.toErrorLog(error));
    }
  }

  private mapApiNotificationToUi(item: NotificationsApiItem): NotificationItem | null {
    const id = item.id ?? item._id;
    if (!id) {
      return null;
    }

    const payload = this.parseNotificationPayload(item.payload);
    const status = String(item.status ?? payload?.['status'] ?? '').toUpperCase();
    const title = item.title?.trim() || this.resolvePushTitle(status);
    const description = item.message?.trim() || item.description?.trim() || item.body?.trim() || 'Notification update';
    const createdAt = item.createdAt ?? item.timestamp ?? new Date().toISOString();
    const requestId = this.extractRequestIdFromApiItem(item);
    const isUnread = item.isRead === true || item.read === true ? false : true;

    return {
      id,
      type: item.type ?? 'BOOKING_STATUS_CHANGED',
      title,
      description,
      timestamp: this.formatRelativeTime(createdAt),
      createdAt,
      isUnread,
      icon: this.resolvePushIcon(status),
      colorClass: this.resolvePushColor(status),
      requestId,
      status: status || null,
    };
  }

  private async markSingleAsReadOnServer(notificationId: string): Promise<void> {
    const updated = this.notifications.map((notification) =>
      notification.id === notificationId ? { ...notification, isUnread: false } : notification,
    );
    this.updateNotifications(updated);

    if (this.isClientGeneratedNotificationId(notificationId)) {
      return;
    }

    try {
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/notifications/${notificationId}/read`, {}));
    } catch (error) {
      console.error(`${DBG} markSingleAsReadOnServer:failed`, this.toErrorLog(error));
      await this.refreshInboxFromServer();
    }
  }

  private isClientGeneratedNotificationId(notificationId: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z-.+$/.test(notificationId.trim());
  }

  private async markAllAsReadOnServer(): Promise<void> {
    const updated = this.notifications.map((notification) => ({
      ...notification,
      isUnread: false,
    }));
    this.updateNotifications(updated);

    try {
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/notifications/read-all`, {}));
    } catch (error) {
      console.error(`${DBG} markAllAsReadOnServer:failed`, this.toErrorLog(error));
      await this.refreshInboxFromServer();
    }
  }

  private resolveNotificationRequestId(
    notification: Pick<NotificationItem, 'id' | 'requestId'>,
  ): string | null {
    const direct = notification.requestId?.trim();
    if (direct) {
      return direct;
    }

    return this.parseRequestIdFromNotificationId(notification.id);
  }

  private extractRequestIdFromApiItem(item: NotificationsApiItem): string | null {
    const direct = item.requestId ?? item.bookingId ?? item.orderId ?? item.referenceId;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const payload = this.parseNotificationPayload(item.payload);
    if (payload) {
      const fromPayload =
        payload['requestId'] ?? payload['bookingId'] ?? payload['orderId'] ?? payload['referenceId'];
      if (typeof fromPayload === 'string' && fromPayload.trim()) {
        return fromPayload.trim();
      }
    }

    if (item.booking) {
      if (typeof item.booking === 'string' && item.booking.trim()) {
        return item.booking.trim();
      }

      if (typeof item.booking === 'object') {
        const nested = item.booking.id ?? item.booking._id ?? item.booking.requestId;
        if (typeof nested === 'string' && nested.trim()) {
          return nested.trim();
        }
      }
    }

    const data = this.parseNotificationPayload(item.data) ?? this.parseNotificationPayload(item.metadata);
    if (data) {
      const fromData = data['bookingId'] ?? data['requestId'] ?? data['orderId'] ?? data['referenceId'];
      if (typeof fromData === 'string' && fromData.trim()) {
        return fromData.trim();
      }
    }

    return null;
  }

  private parseNotificationPayload(payload: unknown): Record<string, unknown> | null {
    if (!payload) {
      return null;
    }

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload) as unknown;
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
      } catch {
        return null;
      }
    }

    if (typeof payload === 'object') {
      return payload as Record<string, unknown>;
    }

    return null;
  }

  private parseRequestIdFromNotificationId(notificationId: string): string | null {
    const match = notificationId.match(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z-(.+)$/);
    const parsed = match?.[1]?.trim();
    return parsed || null;
  }

  private mergeNotifications(
    serverNotifications: NotificationItem[],
    localNotifications: NotificationItem[],
  ): NotificationItem[] {
    const byId = new Map<string, NotificationItem>();

    for (const notification of localNotifications) {
      byId.set(notification.id, notification);
    }

    for (const notification of serverNotifications) {
      byId.set(notification.id, notification);
    }

    return Array.from(byId.values()).sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  private async presentNavigationErrorToast(): Promise<void> {
    try {
      const toast = await this.toastController.create({
        message: 'Unable to open this request. Please open it from Request History.',
        duration: 2600,
        position: 'bottom',
        color: 'warning',
      });
      await toast.present();
    } catch (error) {
      console.error(`${DBG} presentNavigationErrorToast:failed`, error);
    }
  }

  private async presentForegroundToast(notification: NotificationItem): Promise<void> {
    try {
      const toast = await this.toastController.create({
        header: notification.title,
        message: notification.description,
        duration: 2600,
        position: 'top',
        buttons: [
          {
            text: 'Open',
            handler: () => {
              void this.openNotification(notification.id);
            },
          },
        ],
      });
      await toast.present();
    } catch (error) {
      console.error(`${DBG} presentForegroundToast:failed`, this.toErrorLog(error));
    }
  }
}
