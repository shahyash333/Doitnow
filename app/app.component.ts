import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { IonRouterOutlet, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

import { AuthService } from './core/services/auth.service';
import { AddressService } from './core/services/address.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  @ViewChild(IonRouterOutlet, { static: true }) private routerOutlet?: IonRouterOutlet;
  private backButtonSubscription?: Subscription;

  constructor(
    private readonly router: Router,
    private readonly platform: Platform,
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
  ) {}

  ngOnInit(): void {
    this.initializeGoogleAuth();
    this.authService.restoreSession();
    this.addressService.bootstrapFromAuth();
    this.initializeAndroidBackButtonHandling();
  }

  ngOnDestroy(): void {
    this.backButtonSubscription?.unsubscribe();
  }

  private initializeGoogleAuth(): void {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }

    try {
      GoogleAuth.initialize({
        clientId: environment.google.webClientId,
        scopes: ['profile', 'email'],
      });
    } catch (error) {
      console.error('GoogleAuth initialization failed', error);
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
}
