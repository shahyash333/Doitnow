import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadChildren: () =>
          import('../../features/home/home.module').then((module) => module.HomeModule),
      },
      {
        path: 'requests',
        loadChildren: () =>
          import('../../features/requests/requests.module').then((module) => module.RequestsModule),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./tabs-alerts-placeholder.component').then(
            (component) => component.TabsAlertsPlaceholderComponent,
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('../../features/profile/profile.module').then((module) => module.ProfileModule),
      },
      {
        path: 'booking',
        loadChildren: () =>
          import('../../features/booking/booking.module').then((module) => module.BookingPageModule),
      },
      {
        path: 'location',
        loadChildren: () =>
          import('../../features/location/location.module').then((module) => module.LocationPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TabsPageRoutingModule {}
