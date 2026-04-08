import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { ServicesPageRoutingModule } from './services-routing.module';
import { ServicesPage } from './services.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [IonicModule, SharedModule, ServicesPageRoutingModule],
  declarations: [ServicesPage],
})
export class ServicesModule {}
