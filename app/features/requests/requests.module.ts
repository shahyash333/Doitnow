import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { RequestsPageRoutingModule } from './requests-routing.module';
import { RequestsPage } from './requests.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [IonicModule, SharedModule, RequestsPageRoutingModule],
  declarations: [RequestsPage],
})
export class RequestsModule {}
