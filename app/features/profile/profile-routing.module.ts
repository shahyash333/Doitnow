import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HelpSupportPage } from './help-support/help-support.page';
import { ProfilePage } from './profile.page';

const routes: Routes = [
  {
    path: '',
    component: ProfilePage,
  },
  {
    path: 'help-support',
    component: HelpSupportPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilePageRoutingModule {}
