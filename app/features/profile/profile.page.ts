import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  callOutline,
  chevronForwardOutline,
  createOutline,
  globeOutline,
  heartOutline,
  helpCircleOutline,
  locationOutline,
  logOutOutline,
  mailOutline,
  shieldCheckmarkOutline,
  starOutline,
  timeOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  readonly icons = {
    callOutline,
    chevronForwardOutline,
    createOutline,
    globeOutline,
    heartOutline,
    helpCircleOutline,
    locationOutline,
    logOutOutline,
    mailOutline,
    shieldCheckmarkOutline,
    starOutline,
    timeOutline,
    checkmarkCircleOutline,
  };

  constructor() {
    addIcons(this.icons);
  }
}
