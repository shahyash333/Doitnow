import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';

import { Address, AddressMutationPayload } from '../../../core/models/address.model';
import { AddressService } from '../../../core/services/address.service';

@Component({
  selector: 'app-address-modal',
  templateUrl: './address-modal.component.html',
  styleUrls: ['./address-modal.component.scss'],
})
export class AddressModalComponent implements OnInit, OnDestroy {
  addresses: Address[] = [];
  selectedAddress: Address | null = null;
  currentView: 'list' | 'form' = 'list';
  editingAddress: Address | null = null;
  isBusy = false;
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
    this.currentView = 'form';
  }

  openEditForm(address: Address): void {
    this.editingAddress = address;
    this.currentView = 'form';
  }

  onCancelForm(): void {
    this.currentView = 'list';
    this.editingAddress = null;
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
    } catch {
      await this.presentToast('Unable to save address right now.', 'danger');
    } finally {
      this.isBusy = false;
    }
  }

  private async confirmDelete(address: Address): Promise<void> {
    this.isBusy = true;
    try {
      await firstValueFrom(this.addressService.deleteAddress(address.id));
      await this.presentToast('Address deleted.');
    } catch {
      await this.presentToast('Unable to delete address right now.', 'danger');
    } finally {
      this.isBusy = false;
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
