import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { SharedModule } from '../../shared/shared.module';
import { BookingPageRoutingModule } from './booking-routing.module';
import { BookingPage } from './booking.page';

@NgModule({
  declarations: [BookingPage],
  imports: [IonicModule, SharedModule, BookingPageRoutingModule],
})
export class BookingPageModule {}
