import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [IonicModule, FormsModule, SharedModule, HomePageRoutingModule],
  declarations: [HomePage],
})
export class HomeModule {}
