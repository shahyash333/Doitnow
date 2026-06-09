import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { HelpSupportPage } from './help-support/help-support.page';
import { ProfilePageRoutingModule } from './profile-routing.module';
import { ProfilePage } from './profile.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [IonicModule, SharedModule, ProfilePageRoutingModule],
  declarations: [ProfilePage, HelpSupportPage],
})
export class ProfileModule {}
