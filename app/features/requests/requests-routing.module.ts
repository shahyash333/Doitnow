import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { RequestsPage } from './requests.page';
import { RequestDetailsPage } from './request-details.page';

const routes: Routes = [
  {
    path: '',
    component: RequestsPage,
  },
  {
    path: ':requestId',
    component: RequestDetailsPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RequestsPageRoutingModule {}
