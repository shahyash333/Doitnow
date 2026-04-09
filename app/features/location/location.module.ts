import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LocationPageRoutingModule } from './location-routing.module';
import { LocationPage } from './location.page';

@NgModule({
  imports: [CommonModule, IonicModule, LocationPageRoutingModule],
  declarations: [LocationPage],
})
export class LocationPageModule {}

