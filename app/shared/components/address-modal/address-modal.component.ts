import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { Address, AddressMutationPayload } from '../../../core/models/address.model';
import { AddressService } from '../../../core/services/address.service';
import { AddressFormComponent } from '../address-form/address-form.component';

@Component({
  selector: 'app-address-modal',
  templateUrl: './address-modal.component.html',
  styleUrls: ['./address-modal.component.scss'],
})
export class AddressModalComponent implements OnInit, OnDestroy {
  @Input() openMode: 'list' | 'add' | 'edit' = 'list';
  @Input() prefillAddress: Address | null = null;

  @ViewChild('addressForm') addressForm?: AddressFormComponent;

  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  currentView: 'list' | 'form' = 'list';
  editingAddress: Address | null = null;
  isBusy = false;
  private enteredFormFromList = false;
  private readonly subscriptions = new Subscription();

  readonly icons = {
    closeOutline,
  };

  constructor(
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly addressService: AddressService,
  ) {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    if (this.openMode === 'add') {
      this.currentView = 'form';
      this.editingAddress = null;
      this.enteredFormFromList = false;
      void this.expandModalForForm();
    } else if (this.openMode === 'edit' && this.prefillAddress) {
      this.currentView = 'form';
      this.editingAddress = this.prefillAddress;
      this.enteredFormFromList = false;
      void this.expandModalForForm();
    }

    this.subscriptions.add(
      this.addressService.addressList$.subscribe((addresses) => {
        this.addresses = addresses;
      }),
    );

    this.subscriptions.add(
      this.addressService.selectedAddress$.subscribe((selectedAddress) => {
        this.selectedAddress = selectedAddress;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  close(): void {
    void this.modalController.dismiss();
  }

  onSelectAddress(address: Address): void {
    this.addressService.setSelectedAddress(address);
    void this.modalController.dismiss({ selectedAddressId: address.id });
  }

  openAddForm(): void {
    this.editingAddress = null;
    this.enteredFormFromList = true;
    this.currentView = 'form';
    void this.expandModalForForm();
  }

  openEditForm(address: Address): void {
    this.editingAddress = address;
    this.enteredFormFromList = true;
    this.currentView = 'form';
    void this.expandModalForForm();
  }

  onCancelForm(): void {
    if (!this.enteredFormFromList && (this.openMode === 'add' || this.openMode === 'edit')) {
      this.close();
      return;
    }

    this.currentView = 'list';
    this.editingAddress = null;
    void this.setModalBreakpoint(0.82);
  }

  submitForm(): void {
    this.addressForm?.submit();
  }

  async onDeleteAddress(address: Address): Promise<void> {
    if (this.isBusy) {
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
            void this.confirmDelete(address);
          },
        },
      ],
    });

    await confirmation.present();
  }

  async onSaveAddress(payload: AddressMutationPayload): Promise<void> {
    if (this.isBusy) {
      return;
    }

    this.isBusy = true;
    try {
      if (this.editingAddress) {
        await firstValueFrom(this.addressService.updateAddress(this.editingAddress.id, payload));
        await this.presentToast('Address updated.');
      } else {
        await firstValueFrom(this.addressService.createAddress(payload));
        await this.presentToast('Address added.');
      }

      await this.modalController.dismiss();
    } catch (error: unknown) {
      await this.presentToast(this.extractMutationError(error), 'danger');
    } finally {
      this.isBusy = false;
    }
  }

  private async confirmDelete(address: Address): Promise<void> {
    this.isBusy = true;
    try {
      await firstValueFrom(this.addressService.deleteAddress(address.id));
      await this.presentToast('Address deleted.');
    } catch (error: unknown) {
      await this.presentToast(this.extractMutationError(error, 'delete'), 'danger');
    } finally {
      this.isBusy = false;
    }
  }

  private extractMutationError(error: unknown, action: 'save' | 'delete' = 'save'): string {
    if (error instanceof HttpErrorResponse) {
      const message = this.extractErrorMessageFromBody(error.error);
      if (message) {
        return message;
      }

      if (error.status === 404) {
        return 'Address not found';
      }
    }

    return action === 'delete' ? 'Unable to delete address right now.' : 'Unable to save address right now.';
  }

  private extractErrorMessageFromBody(errorBody: unknown): string | null {
    if (typeof errorBody === 'string') {
      const trimmed = errorBody.trim();
      return trimmed ? trimmed : null;
    }

    if (!errorBody || typeof errorBody !== 'object') {
      return null;
    }

    const source = errorBody as Record<string, unknown>;
    const message = source['message'];
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }

    return null;
  }

  private async expandModalForForm(): Promise<void> {
    await this.setModalBreakpoint(1);
  }

  private async setModalBreakpoint(value: number): Promise<void> {
    const modal = await this.modalController.getTop();
    if (!modal) {
      return;
    }

    try {
      await modal.setCurrentBreakpoint(value);
    } catch {
      // Sheet may not support breakpoints on all platforms.
    }
  }

  private async presentToast(
    message: string,
    color: 'success' | 'danger' = 'success',
  ): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
