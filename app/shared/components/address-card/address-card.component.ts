import { Component, EventEmitter, Input, Output } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  createOutline,
  locationOutline,
  starOutline,
  trashOutline,
} from 'ionicons/icons';

import { Address } from '../../../core/models/address.model';

@Component({
  selector: 'app-address-card',
  templateUrl: './address-card.component.html',
  styleUrls: ['./address-card.component.scss'],
})
export class AddressCardComponent {
  @Input({ required: true }) address!: Address;
  @Input() isSelected = false;

  @Output() select = new EventEmitter<Address>();
  @Output() edit = new EventEmitter<Address>();
  @Output() remove = new EventEmitter<Address>();

  readonly icons = {
    checkmarkCircleOutline,
    createOutline,
    locationOutline,
    starOutline,
    trashOutline,
  };

  constructor() {
    addIcons(this.icons);
  }

  onSelect(): void {
    this.select.emit(this.address);
  }

  onEdit(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.address);
  }

  onDelete(event: Event): void {
    event.stopPropagation();
    this.remove.emit(this.address);
  }
}
