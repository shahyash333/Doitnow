import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  carOutline,
  cutOutline,
  flashOutline,
  locationOutline,
  restaurantOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  waterOutline,
} from 'ionicons/icons';

import { environment } from '../../../environments/environment';

interface ServiceHighlight {
  title: string;
  icon: keyof WebLandingPage['icons'];
  tone: 'mint' | 'peach' | 'sky' | 'lavender' | 'amber' | 'rose';
}

interface BenefitItem {
  title: string;
  icon: keyof WebLandingPage['icons'];
}

interface StepItem {
  title: string;
  icon: keyof WebLandingPage['icons'];
}

@Component({
  standalone: true,
  selector: 'app-web-landing',
  imports: [CommonModule, IonicModule],
  templateUrl: './web-landing.page.html',
  styleUrls: ['./web-landing.page.scss'],
})
export class WebLandingPage {
  readonly icons = {
    arrowForwardOutline,
    carOutline,
    cutOutline,
    flashOutline,
    locationOutline,
    restaurantOutline,
    shieldCheckmarkOutline,
    sparklesOutline,
    waterOutline,
  };

  readonly currentYear = new Date().getFullYear();
  readonly primaryCtaLabel = 'Book Now';

  readonly serviceHighlights: ServiceHighlight[] = [
    { title: 'Cleaning', icon: 'sparklesOutline', tone: 'mint' },
    { title: 'Cooking', icon: 'restaurantOutline', tone: 'peach' },
    { title: 'Car Wash', icon: 'carOutline', tone: 'sky' },
    { title: 'Electrician', icon: 'flashOutline', tone: 'amber' },
    { title: 'Plumbing', icon: 'waterOutline', tone: 'lavender' },
    { title: 'Beauty', icon: 'cutOutline', tone: 'rose' },
  ];

  readonly benefits: BenefitItem[] = [
    { title: 'Verified pros', icon: 'shieldCheckmarkOutline' },
    { title: 'Easy booking', icon: 'sparklesOutline' },
    { title: 'Live tracking', icon: 'locationOutline' },
    { title: 'Clear pricing', icon: 'flashOutline' },
  ];

  readonly steps: StepItem[] = [
    { title: 'Pick a service', icon: 'sparklesOutline' },
    { title: 'Choose a time', icon: 'locationOutline' },
    { title: 'Relax at home', icon: 'shieldCheckmarkOutline' },
  ];

  constructor(private readonly router: Router) {
    addIcons(this.icons);
  }

  continueToSignIn(): void {
    void this.router.navigate(['/login']);
  }

  async openPlayStore(): Promise<void> {
    const url = environment.playStoreUrl;
    if (!url?.trim()) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url, presentationStyle: 'fullscreen' });
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async openPrivacyPolicy(): Promise<void> {
    window.open(environment.privacyPolicyUrl, '_blank', 'noopener,noreferrer');
  }

  async openTermsOfService(): Promise<void> {
    window.open(environment.termsOfServiceUrl, '_blank', 'noopener,noreferrer');
  }

  get hasPlayStoreLink(): boolean {
    return Boolean(environment.playStoreUrl?.trim());
  }
}
