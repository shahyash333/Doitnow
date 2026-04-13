import { Component, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  callOutline,
  chevronForwardOutline,
  createOutline,
  globeOutline,
  heartOutline,
  helpCircleOutline,
  locationOutline,
  logOutOutline,
  mailOutline,
  shieldCheckmarkOutline,
  starOutline,
  timeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AuthService, AuthUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnDestroy {
  isLoggingOut = false;
  user: AuthUser | null = null;
  isSavingPhone = false;
  hasAvatarLoadError = false;
  private userSubscription: Subscription;

  readonly icons = {
    callOutline,
    chevronForwardOutline,
    createOutline,
    globeOutline,
    heartOutline,
    helpCircleOutline,
    locationOutline,
    logOutOutline,
    mailOutline,
    shieldCheckmarkOutline,
    starOutline,
    timeOutline,
    checkmarkCircleOutline,
  };

  constructor(
    private readonly authService: AuthService,
    private readonly alertController: AlertController,
  ) {
    addIcons(this.icons);
    this.user = this.authService.getCurrentUser();
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.user = user;
      this.hasAvatarLoadError = false;
    });
  }

  async onLogout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    try {
      await this.authService.logout();
    } finally {
      this.isLoggingOut = false;
    }
  }

  async onAddPhone(): Promise<void> {
    if (this.isSavingPhone) {
      return;
    }

    this.isSavingPhone = true;

    try {
      const alert = await this.alertController.create({
        header: 'Add phone number',
        message: 'Optional: you can add a phone number for easier contact.',
        inputs: [
          {
            name: 'phone',
            type: 'tel',
            placeholder: 'Enter phone number',
            value: this.user?.phone ?? '',
          },
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Save',
            handler: (data: { phone?: string }) => {
              const phone = data.phone?.trim() ?? '';
              if (!phone) {
                return false;
              }

              this.authService.updateLocalPhone(phone);
              return true;
            },
          },
        ],
      });

      await alert.present();
      await alert.onDidDismiss();
    } finally {
      this.isSavingPhone = false;
    }
  }

  get displayName(): string {
    return this.user?.fullName?.trim() || this.user?.email?.trim() || 'DoItNow User';
  }

  get displayEmail(): string {
    return this.user?.email?.trim() || 'No email added';
  }

  get hasPhone(): boolean {
    return Boolean(this.user?.phone?.trim());
  }

  get displayPhone(): string {
    return this.user?.phone?.trim() || '';
  }

  get avatarText(): string {
    const preferred = this.user?.fullName?.trim() || this.user?.email?.trim() || 'U';
    return preferred.charAt(0).toUpperCase();
  }

  get hasAvatarUrl(): boolean {
    return Boolean(this.user?.avatarUrl?.trim()) && !this.hasAvatarLoadError;
  }

  get avatarUrl(): string {
    return this.user?.avatarUrl?.trim() || '';
  }

  onAvatarError(): void {
    this.hasAvatarLoadError = true;
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
  }
}
