import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { BaseService } from './base.service';

export interface ServiceAddonItem {
  id: string;
  label: string;
  description: string | null;
  price: number;
  currency: string;
}

export interface ServiceAddonGroup {
  id: string;
  title: string;
  helpText: string | null;
  selectionType: 'SINGLE' | 'MULTI';
  minSelection: number;
  maxSelection: number | null;
  isRequired: boolean;
  addons: ServiceAddonItem[];
}

export interface CatalogServiceItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  startingPrice: number;
  currency: string;
  priceText: string;
  imageUrl: string | null;
  iconUrl: string | null;
  displayType: 'BANNER' | 'ICON' | string;
  colorClass: string | null;
  tag: string | null;
  isPopular: boolean;
  addonGroups: ServiceAddonGroup[];
}

export interface CatalogResponse {
  popular: CatalogServiceItem[];
  others: CatalogServiceItem[];
}

@Injectable({
  providedIn: 'root',
})
export class CatalogService extends BaseService {
  private catalogRequest$?: Observable<CatalogResponse>;

  constructor(http: HttpClient) {
    super(http);
  }

  getCatalog(forceRefresh = false): Observable<CatalogResponse> {
    if (!this.catalogRequest$ || forceRefresh) {
      this.catalogRequest$ = this.http
        .get<CatalogResponse>(`${environment.apiUrl}/catalog`)
        .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    }

    return this.catalogRequest$;
  }

  findServiceInCatalog(
    serviceId?: string | null,
    serviceSlug?: string | null,
  ): Observable<CatalogServiceItem | null> {
    const normalizedId = serviceId?.trim().toLowerCase() ?? '';
    const normalizedSlug = serviceSlug?.trim().toLowerCase() ?? '';

    return this.getCatalog().pipe(
      map((catalog) => {
        const allServices = [...catalog.popular, ...catalog.others];
        return (
          allServices.find((service) => {
            if (normalizedId && service.id.toLowerCase() === normalizedId) {
              return true;
            }

            if (normalizedSlug && service.slug.toLowerCase() === normalizedSlug) {
              return true;
            }

            return false;
          }) ?? null
        );
      }),
    );
  }

  findServiceByTitle(title?: string | null): Observable<CatalogServiceItem | null> {
    const normalizedTitle = title?.trim().toLowerCase() ?? '';

    if (!normalizedTitle) {
      return this.getCatalog().pipe(map(() => null));
    }

    return this.getCatalog().pipe(
      map((catalog) => {
        const allServices = [...catalog.popular, ...catalog.others];
        return (
          allServices.find((service) => service.title.trim().toLowerCase() === normalizedTitle) ?? null
        );
      }),
    );
  }
}
