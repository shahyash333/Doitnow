import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { AuthService } from './core/services/auth.service';
import { AddressService } from './core/services/address.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
})
export class AppComponent implements OnInit {
  constructor(
    private readonly authService: AuthService,
    private readonly addressService: AddressService,
  ) {}

  ngOnInit(): void {
    this.initializeGoogleAuth();
    this.authService.restoreSession();
    this.addressService.bootstrapFromAuth();
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
}
