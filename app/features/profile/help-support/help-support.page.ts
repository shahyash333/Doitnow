import { Component } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import { addIcons } from 'ionicons';
import { chevronBackOutline, mailOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';

import { SupportFaqItem, SupportService } from '../../../core/services/support.service';

@Component({
  selector: 'app-help-support',
  templateUrl: './help-support.page.html',
  styleUrls: ['./help-support.page.scss'],
})
export class HelpSupportPage implements ViewWillEnter {
  isLoading = false;
  loadError = '';
  supportEmail = '';
  faqs: SupportFaqItem[] = [];

  readonly icons = {
    chevronBackOutline,
    mailOutline,
  };

  constructor(
    private readonly location: Location,
    private readonly supportService: SupportService,
  ) {
    addIcons(this.icons);
  }

  ionViewWillEnter(): void {
    void this.loadSupportContent();
  }

  back(): void {
    this.location.back();
  }

  async contactSupport(): Promise<void> {
    const email = this.supportEmail.trim();
    if (!email) {
      return;
    }

    const subject = encodeURIComponent('DoItNow Support Request');
    const mailtoUrl = `mailto:${email}?subject=${subject}`;
    window.location.href = mailtoUrl;
  }

  async retryLoad(): Promise<void> {
    await this.loadSupportContent();
  }

  trackFaq(_index: number, faq: SupportFaqItem): string {
    return faq.id;
  }

  private async loadSupportContent(): Promise<void> {
    this.isLoading = true;
    this.loadError = '';

    try {
      const response = await firstValueFrom(this.supportService.getSupportContent());
      const data = response.data;
      this.supportEmail = data.supportEmail?.trim() ?? '';
      this.faqs = [...(data.faqs ?? [])].sort((left, right) => {
        const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
      });
    } catch (error: unknown) {
      this.loadError = this.extractErrorMessage(error);
      this.supportEmail = '';
      this.faqs = [];
    } finally {
      this.isLoading = false;
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const errorBody = error.error as Record<string, unknown> | string | null;

      if (typeof errorBody === 'string' && errorBody.trim()) {
        return errorBody.trim();
      }

      if (errorBody && typeof errorBody === 'object') {
        const message = errorBody['message'];
        if (typeof message === 'string' && message.trim()) {
          return message.trim();
        }
      }
    }

    return 'Unable to load help content right now.';
  }
}
