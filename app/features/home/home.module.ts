import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [IonicModule, SharedModule, HomePageRoutingModule],
  declarations: [HomePage],
})
export class HomeModule {}
