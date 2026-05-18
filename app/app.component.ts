import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { IonRouterOutlet, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { AddressService } from './core/services/address.service';
import { NotificationsService } from './core/services/notifications.service';
import { environment } from '../environments/environment';

const APP_DBG = '[DOITNOW_APP_DEBUG]';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild(IonRouterOutlet, { static: true }) private routerOutlet?: IonRouterOutlet;
  private backButtonSubscription?: Subscription;
  private authStateSubscription?: Subscription;
  private appStateSubscriptionCleanup?: { remove: () => Promise<void> };

  constructor(
    private readonly router: Router,
    private readonly platform: Platform,
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
    private readonly notificationsService: NotificationsService,
  ) {}

  ngOnInit(): void {
    console.log(`${APP_DBG} ngOnInit:start`, { platform: Capacitor.getPlatform() });
    this.initializeGoogleAuth();
    this.authService.restoreSession();
    this.addressService.bootstrapFromAuth();
    this.initializeNotifications();
    this.initializeAndroidBackButtonHandling();
    console.log(`${APP_DBG} ngOnInit:done`);
  }

  async ngOnDestroy(): Promise<void> {
    this.backButtonSubscription?.unsubscribe();
    this.authStateSubscription?.unsubscribe();
    await this.appStateSubscriptionCleanup?.remove();
  }

  private initializeGoogleAuth(): void {
    if (Capacitor.getPlatform() !== 'android') {
      console.log(`${APP_DBG} initializeGoogleAuth:skipped_non_android`);
      return;
    }

    try {
      console.log(`${APP_DBG} initializeGoogleAuth:start`);
      GoogleAuth.initialize({
        clientId: environment.google.webClientId,
        scopes: ['profile', 'email'],
      });
      console.log(`${APP_DBG} initializeGoogleAuth:done`);
    } catch (error) {
      console.error(`${APP_DBG} initializeGoogleAuth:failed`, error);
    }
  }

  private initializeAndroidBackButtonHandling(): void {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(10, async () => {
      const currentPath = this.normalizePath(this.router.url);
      const isOnHomeRoot = currentPath === '/home';

      if (this.isTabRootPath(currentPath) && !isOnHomeRoot) {
        await this.router.navigateByUrl('/home');
        return;
      }

      if (this.routerOutlet?.canGoBack()) {
        await this.routerOutlet.pop();
        return;
      }

      if (!isOnHomeRoot) {
        await this.router.navigateByUrl('/home');
        return;
      }

      await CapacitorApp.exitApp();
    });
  }

  private normalizePath(url: string): string {
    const path = url.split('?')[0].split('#')[0];
    if (!path) {
      return '/';
    }

    return path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  }

  private isTabRootPath(path: string): boolean {
    return path === '/home/profile' || path === '/home/requests' || path === '/home/alerts';
  }

  private initializeNotifications(): void {
    console.log(`${APP_DBG} initializeNotifications:subscribe`);
    this.authStateSubscription = this.authService.isLoggedIn$.subscribe((isLoggedIn) => {
      console.log(`${APP_DBG} authStateChanged`, { isLoggedIn });
      if (isLoggedIn) {
        void this.setupNotificationFlows();
        return;
      }

      this.notificationsService.clearAll();
    });
  }

  private async setupNotificationFlows(): Promise<void> {
    console.log(`${APP_DBG} setupNotificationFlows:start`);
    try {
      await this.platform.ready();
      console.log(`${APP_DBG} setupNotificationFlows:platform_ready`);
      await this.notificationsService.initializePushNotifications();
      console.log(`${APP_DBG} setupNotificationFlows:push_init_done`);
      await this.notificationsService.syncInAppNotifications();
      console.log(`${APP_DBG} setupNotificationFlows:in_app_sync_done`);
    } catch (error) {
      console.error(`${APP_DBG} setupNotificationFlows:failed`, error);
    }

    if (Capacitor.getPlatform() !== 'web' && !this.appStateSubscriptionCleanup) {
      console.log(`${APP_DBG} setupNotificationFlows:attach_app_state_listener`);
      this.appStateSubscriptionCleanup = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        console.log(`${APP_DBG} appStateChange`, { isActive });
        if (isActive && this.authService.isLoggedIn()) {
          void this.notificationsService.syncInAppNotifications();
        }
      });
    }
    console.log(`${APP_DBG} setupNotificationFlows:done`);
  }
}
