import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ServiceCardComponent } from './components/service-card/service-card.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { CategoryChipComponent } from './components/category-chip/category-chip.component';
import { ServiceBookingFormComponent } from './components/service-booking-form/service-booking-form.component';

@NgModule({
  declarations: [
    ServiceCardComponent,
    SearchBarComponent,
    CategoryChipComponent,
    ServiceBookingFormComponent,
  ],
  imports: [CommonModule, IonicModule],
  exports: [
    CommonModule,
    IonicModule,
    ServiceCardComponent,
    SearchBarComponent,
    CategoryChipComponent,
    ServiceBookingFormComponent,
  ],
})
export class SharedModule {}
