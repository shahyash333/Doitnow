import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { RequestsPageRoutingModule } from './requests-routing.module';
import { RequestsPage } from './requests.page';
import { SharedModule } from '../../shared/shared.module';
import { RequestDetailsPage } from './request-details.page';

@NgModule({
  imports: [IonicModule, SharedModule, RequestsPageRoutingModule],
  declarations: [RequestsPage, RequestDetailsPage],
})
export class RequestsModule {}
