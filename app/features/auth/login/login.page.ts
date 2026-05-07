import { Component } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { AlertController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import { lockClosedOutline } from 'ionicons/icons';

import { AuthService, GoogleSignInFlowError } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

const DEBUG = !environment.production;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  readonly icons = {
    lockClosedOutline,
  };
  isLoading = false;
  errorMessage = '';
  readonly debug = DEBUG;

  constructor(
    private readonly authService: AuthService,
    private readonly alertController: AlertController,
  ) {
    addIcons(this.icons);
  }

  async signInWithGoogle(): Promise<void> {
    if (this.isLoading) {
      return;
    }

    this.errorMessage = '';

    if (DEBUG) {
      console.log('[LoginPage] Platform detected:', Capacitor.getPlatform());
      console.log('[LoginPage] Google login started');
    }

    this.isLoading = true;

    try {
      await this.authService.signInWithGoogle();
    } catch (error) {
      console.error('Unable to sign in with Google', error);
      if (DEBUG) {
        this.errorMessage = this.getDetailedErrorMessage(error);
      }
      await this.showSignInErrorPopup(error);
    } finally {
      this.isLoading = false;
    }
  }

  async openPrivacyPolicy(): Promise<void> {
    const url = environment.privacyPolicyUrl;

    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({
          url,
          presentationStyle: 'fullscreen',
        });
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Unable to open privacy policy', error);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private async showSignInErrorPopup(error: unknown): Promise<void> {
    const message = DEBUG ? this.getDetailedErrorMessage(error) : this.getErrorMessage(error);
    const platform = Capacitor.getPlatform();
    const alert = await this.alertController.create({
      header: 'Google Sign-In Failed',
      subHeader: `Platform: ${platform}`,
      message,
      buttons: ['OK'],
    });

    await alert.present();
  }

  private getDetailedErrorMessage(error: unknown): string {
    if (error instanceof GoogleSignInFlowError) {
      const details = error.technicalDetails ? `\nDetails: ${error.technicalDetails}` : '';
      return `Message: ${error.message}\nCode: ${String(error.code ?? 'N/A')}${details}`;
    }

    if (error instanceof Error) {
      return `Message: ${error.message}`;
    }

    if (error && typeof error === 'object') {
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        return this.getErrorMessage(error);
      }
    }

    return this.getErrorMessage(error);
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof GoogleSignInFlowError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim().length > 0) {
      return error;
    }

    if (error && typeof error === 'object') {
      try {
        return JSON.stringify(error, null, 2);
      } catch {
        return 'Unknown error object received during sign-in.';
      }
    }

    return 'An unknown error occurred during Google sign-in.';
  }
}
