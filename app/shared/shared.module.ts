import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ServiceCardComponent } from './components/service-card/service-card.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { CategoryChipComponent } from './components/category-chip/category-chip.component';
import { ServiceBookingFormComponent } from './components/service-booking-form/service-booking-form.component';
import { AddressCardComponent } from './components/address-card/address-card.component';
import { AddressFormComponent } from './components/address-form/address-form.component';
import { AddressListComponent } from './components/address-list/address-list.component';
import { AddressModalComponent } from './components/address-modal/address-modal.component';
import { BookingAddonsSheetComponent } from './components/booking-addons-sheet/booking-addons-sheet.component';

@NgModule({
  declarations: [
    BookingAddonsSheetComponent,
    ServiceCardComponent,
    SearchBarComponent,
    CategoryChipComponent,
    ServiceBookingFormComponent,
    AddressCardComponent,
    AddressFormComponent,
    AddressListComponent,
    AddressModalComponent,
    BookingAddonsSheetComponent,
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BookingAddonsSheetComponent,
    ServiceCardComponent,
    SearchBarComponent,
    CategoryChipComponent,
    ServiceBookingFormComponent,
    AddressCardComponent,
    AddressFormComponent,
    AddressListComponent,
    AddressModalComponent,
  ],
})
export class SharedModule {}
