import { Component, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController } from '@ionic/angular';
import { ModalController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  callOutline,
  chevronDownOutline,
  chevronForwardOutline,
  closeOutline,
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
import { Subscription, firstValueFrom } from 'rxjs';
import { Address } from '../../core/models/address.model';
import { AddressService } from '../../core/services/address.service';
import { AuthService, AuthUser } from '../../core/services/auth.service';
import { AddressModalComponent } from '../../shared/components/address-modal/address-modal.component';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnDestroy {
  isLoggingOut = false;
  user: AuthUser | null = null;
  isSavingPhone = false;
  isAddressBusy = false;
  isSavedAddressesExpanded = false;
  hasAvatarLoadError = false;
  addresses: Address[] = [];
  private readonly subscriptions = new Subscription();

  readonly icons = {
    addOutline,
    callOutline,
    chevronDownOutline,
    chevronForwardOutline,
    closeOutline,
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
    private readonly addressService: AddressService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController,
  ) {
    addIcons(this.icons);
    this.user = this.authService.getCurrentUser();
    this.addressService.bootstrapFromAuth();
    this.subscriptions.add(
      this.authService.user$.subscribe((user) => {
        this.user = user;
        this.hasAvatarLoadError = false;
      }),
    );
    this.subscriptions.add(
      this.addressService.addressList$.subscribe((addresses) => {
        this.addresses = addresses;
      }),
    );
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

  get addressCount(): number {
    return this.addresses.length;
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

  toggleSavedAddresses(): void {
    this.isSavedAddressesExpanded = !this.isSavedAddressesExpanded;
  }

  async openAddressModal(event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.openAddressModalWithProps();
  }

  async openEditAddressModal(address: Address, event?: Event): Promise<void> {
    event?.stopPropagation();
    await this.openAddressModalWithProps({
      openMode: 'edit',
      prefillAddress: address,
    });
  }

  private async openAddressModalWithProps(
    componentProps?: { openMode?: 'list' | 'add' | 'edit'; prefillAddress?: Address | null },
  ): Promise<void> {
    const modal = await this.modalController.create({
      component: AddressModalComponent,
      componentProps,
      cssClass: 'address-modal-sheet',
      breakpoints: [0, 0.54, 0.82, 1],
      initialBreakpoint: 0.82,
      backdropDismiss: true,
      handle: true,
    });
    await modal.present();
  }

  async onDeleteAddress(address: Address, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.isAddressBusy) {
      return;
    }

    const confirmation = await this.alertController.create({
      header: 'Delete address?',
      message: `This will remove "${address.label}" from your saved addresses.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            void this.confirmDeleteAddress(address);
          },
        },
      ],
    });

    await confirmation.present();
  }

  private async confirmDeleteAddress(address: Address): Promise<void> {
    this.isAddressBusy = true;
    try {
      await firstValueFrom(this.addressService.deleteAddress(address.id));
      await this.presentToast('Address deleted.');
    } catch (error: unknown) {
      await this.presentToast(this.extractAddressError(error, 'delete'), 'danger');
    } finally {
      this.isAddressBusy = false;
    }
  }

  private extractAddressError(error: unknown, action: 'save' | 'delete'): string {
    if (error instanceof HttpErrorResponse) {
      const errorBody = error.error as Record<string, unknown> | string | null;

      if (typeof errorBody === 'string' && errorBody.trim()) {
        return errorBody.trim();
      }

      if (errorBody && typeof errorBody === 'object') {
        const message = errorBody['message'];
        if (typeof message === 'string' && message.trim()) {
          return message.trim();
        }
      }

      if (error.status === 404) {
        return 'Address not found';
      }
    }

    return action === 'delete' ? 'Unable to delete address right now.' : 'Unable to save address right now.';
  }

  private async presentToast(message: string, color: 'success' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
