import { Component, EventEmitter, Input, Output } from '@angular/core';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';

import { Address } from '../../../core/models/address.model';

@Component({
  selector: 'app-address-list',
  templateUrl: './address-list.component.html',
  styleUrls: ['./address-list.component.scss'],
})
export class AddressListComponent {
  @Input() addresses: Address[] = [];
  @Input() selectedAddressId: string | null = null;
  @Input() isBusy = false;

  @Output() select = new EventEmitter<Address>();
  @Output() edit = new EventEmitter<Address>();
  @Output() remove = new EventEmitter<Address>();
  @Output() add = new EventEmitter<void>();

  readonly icons = {
    addOutline,
  };

  constructor() {
    addIcons(this.icons);
  }

  trackById(_index: number, address: Address): string {
    return address.id;
  }
}
