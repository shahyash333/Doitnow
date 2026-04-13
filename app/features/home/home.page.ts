import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController } from '@ionic/angular';
import { Subscription, firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  locationOutline,
  notificationsOutline,
  searchOutline,
} from 'ionicons/icons';

import { Address } from '../../core/models/address.model';
import { AddressService } from '../../core/services/address.service';
import { CatalogService, CatalogServiceItem } from '../../core/services/catalog.service';
import { AddressModalComponent } from '../../shared/components/address-modal/address-modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('popularScroller') popularScroller?: ElementRef<HTMLDivElement>;

  readonly icons = {
    chevronDownOutline,
    locationOutline,
    notificationsOutline,
    searchOutline,
  };

  activePopularIndex = 0;
  searchQuery = '';
  isCatalogLoading = true;
  catalogLoadError = '';
  addresses: Address[] = [];
  selectedAddress: Address | null = null;

  popularServices: CatalogServiceItem[] = [];
  otherServices: CatalogServiceItem[] = [];
  private readonly defaultServiceTheme = {
    bg: '#eef2ff',
    text: '#435497',
  };

  private readonly colorThemeMap: Record<string, { bg: string; text: string }> = {
    amber: { bg: '#fef3c7', text: '#92400e' },
    blue: { bg: '#dbeafe', text: '#1e40af' },
    cyan: { bg: '#cffafe', text: '#155e75' },
    emerald: { bg: '#d1fae5', text: '#065f46' },
    gray: { bg: '#f3f4f6', text: '#1f2937' },
    green: { bg: '#dcfce7', text: '#166534' },
    indigo: { bg: '#e0e7ff', text: '#3730a3' },
    lime: { bg: '#ecfccb', text: '#3f6212' },
    mint: { bg: '#e0f3ef', text: '#2aab8e' },
    neutral: { bg: '#f5f5f5', text: '#262626' },
    orange: { bg: '#ffedd5', text: '#9a3412' },
    peach: { bg: '#fff0e3', text: '#ee8a26' },
    purple: { bg: '#f3e8ff', text: '#6b21a8' },
    red: { bg: '#fee2e2', text: '#991b1b' },
    rose: { bg: '#ffe4e6', text: '#9f1239' },
    sky: { bg: '#e0f2fe', text: '#075985' },
    slate: { bg: '#e2e8f0', text: '#0f172a' },
    steel: { bg: '#e7effc', text: '#417cc8' },
    teal: { bg: '#ccfbf1', text: '#115e59' },
    violet: { bg: '#ede9fe', text: '#5b21b6' },
    yellow: { bg: '#fef9c3', text: '#854d0e' },
  };
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly router: Router,
    private readonly modalController: ModalController,
    private readonly addressService: AddressService,
    private readonly catalogService: CatalogService,
  ) {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.addressService.addressList$.subscribe((addresses) => {
        this.addresses = addresses;
      }),
    );

    this.subscriptions.add(
      this.addressService.selectedAddress$.subscribe((selectedAddress) => {
        this.selectedAddress = selectedAddress;
      }),
    );

    void this.loadCatalog();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get locationLabel(): string {
    const selectedAddressShort = this.selectedAddress?.shortAddress?.trim();
    if (selectedAddressShort) {
      return selectedAddressShort;
    }

    const defaultAddressShort = this.addresses.find((address) => address.isDefault)?.shortAddress?.trim();
    if (defaultAddressShort) {
      return defaultAddressShort;
    }

    return 'Select your location';
  }

  async openLocation(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddressModalComponent,
      cssClass: 'address-modal-sheet',
      breakpoints: [0, 0.54, 0.82, 1],
      initialBreakpoint: 0.82,
      backdropDismiss: true,
      handle: true,
    });
    await modal.present();
  }

  openNotifications(): void {
    this.router.navigate(['/home/alerts']);
  }

  onSearchInput(value: string): void {
    this.searchQuery = value;
    this.activePopularIndex = 0;

    const scroller = this.popularScroller?.nativeElement;
    if (scroller) {
      scroller.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  triggerSearch(): void {
    // Search filtering is handled by computed getters.
  }

  onPopularScroll(): void {
    const scroller = this.popularScroller?.nativeElement;
    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>('.popular-card');
    const cardStep = (firstCard?.offsetWidth ?? 220) + 12;
    const approximateIndex = Math.round(scroller.scrollLeft / cardStep);
    const maxIndex = Math.max(this.filteredPopularServices.length - 1, 0);
    this.activePopularIndex = Math.max(0, Math.min(approximateIndex, maxIndex));
  }

  openPopularService(service: CatalogServiceItem): void {
    this.openBookingPage(service);
  }

  openServiceCard(service: CatalogServiceItem): void {
    this.openBookingPage(service);
  }

  retryCatalogLoad(): void {
    void this.loadCatalog(true);
  }

  get filteredPopularServices(): CatalogServiceItem[] {
    const q = this.normalizedQuery(this.searchQuery);
    if (!q) {
      return this.popularServices;
    }

    return this.popularServices.filter((service) =>
      this.matchesQuery(q, service.title, service.subtitle, service.description, service.tag),
    );
  }

  get filteredAllServices(): CatalogServiceItem[] {
    const q = this.normalizedQuery(this.searchQuery);
    if (!q) {
      return this.otherServices;
    }

    return this.otherServices.filter((service) =>
      this.matchesQuery(q, service.title, service.subtitle, service.description, service.tag),
    );
  }

  getCardImage(service: CatalogServiceItem): string {
    return service.imageUrl ?? service.iconUrl ?? '';
  }

  getServiceIcon(service: CatalogServiceItem): string {
    return service.iconUrl ?? service.imageUrl ?? '';
  }

  getServiceTheme(service: CatalogServiceItem): Record<string, string> {
    const theme = this.resolveServiceTheme(service.colorClass);
    return {
      '--service-accent-bg': theme.bg,
      '--service-accent-fg': theme.text,
    };
  }

  getInitials(input: string): string {
    const words = input
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '');

    return words.join('') || 'SV';
  }

  trackByServiceId(_index: number, service: CatalogServiceItem): string {
    return service.id;
  }

  private async loadCatalog(forceRefresh = false): Promise<void> {
    this.isCatalogLoading = true;
    this.catalogLoadError = '';

    try {
      const response = await firstValueFrom(this.catalogService.getCatalog(forceRefresh));
      this.popularServices = response.popular ?? [];
      this.otherServices = response.others ?? [];
      this.activePopularIndex = 0;

      const scroller = this.popularScroller?.nativeElement;
      if (scroller) {
        scroller.scrollTo({ left: 0, behavior: 'auto' });
      }
    } catch {
      this.popularServices = [];
      this.otherServices = [];
      this.catalogLoadError = 'Unable to load services right now. Please try again.';
    } finally {
      this.isCatalogLoading = false;
    }
  }

  private openBookingPage(service: CatalogServiceItem): void {
    this.router.navigate(['/home/booking'], {
      queryParams: {
        serviceId: service.id,
        slug: service.slug,
        service: service.title,
        price: service.startingPrice,
      },
      state: {
        service,
      },
    });
  }

  private normalizedQuery(input: string): string {
    return input.trim().toLowerCase();
  }

  private matchesQuery(q: string, ...fields: Array<string | null | undefined>): boolean {
    return fields.some((field) => (field ?? '').toLowerCase().includes(q));
  }

  private resolveServiceTheme(colorClass: string | null): { bg: string; text: string } {
    const normalized = (colorClass ?? '').trim().toLowerCase();
    if (!normalized) {
      return this.defaultServiceTheme;
    }

    const parts = normalized.split(/\s+/);
    const bgToken = parts.find((part) => part.startsWith('bg-'));
    const textToken = parts.find((part) => part.startsWith('text-'));
    const bgKey = this.extractColorKey(bgToken, 'bg');
    const textKey = this.extractColorKey(textToken, 'text');
    const directMatchKey = parts.find((part) => this.colorThemeMap[part]);
    const key = bgKey ?? textKey ?? directMatchKey ?? null;

    if (!key) {
      return this.defaultServiceTheme;
    }

    return this.colorThemeMap[key] ?? this.defaultServiceTheme;
  }

  private extractColorKey(token: string | undefined, prefix: 'bg' | 'text'): string | null {
    if (!token) {
      return null;
    }

    const segments = token.split('-');
    if (segments.length < 3 || segments[0] !== prefix) {
      return null;
    }

    const key = segments[1];
    return this.colorThemeMap[key] ? key : null;
  }
}
