import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Address, AddressMutationPayload } from '../models/address.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AddressService {
  private readonly selectedAddressStorageKey = 'selectedAddress';
  private readonly addressListSubject = new BehaviorSubject<Address[]>([]);
  private readonly selectedAddressSubject = new BehaviorSubject<Address | null>(null);

  readonly addressList$ = this.addressListSubject.asObservable();
  readonly selectedAddress$ = this.selectedAddressSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {
    this.bootstrapFromAuth();
    this.authService.user$.subscribe((user) => {
      this.setAddressesFromAuth(user?.addresses ?? []);
    });
  }

  bootstrapFromAuth(): void {
    this.setAddressesFromAuth(this.authService.getCurrentUser()?.addresses ?? []);
  }

  setSelectedAddress(address: Address | null): void {
    if (!address) {
      this.selectedAddressSubject.next(null);
      localStorage.removeItem(this.selectedAddressStorageKey);
      return;
    }

    const available = this.addressListSubject.value.find((item) => item.id === address.id);
    if (!available) {
      return;
    }

    this.selectedAddressSubject.next(available);
    this.persistSelectedAddress(available);
  }

  createAddress(payload: AddressMutationPayload): Observable<Address[]> {
    return this.http.post<unknown>(`${environment.apiUrl}/address`, payload).pipe(
      map((response) => this.extractAddressList(response)),
      tap((addresses) => {
        const normalized = this.normalizeAddresses(addresses);
        const defaultAddress = normalized.find((item) => item.isDefault) ?? normalized[0] ?? null;
        this.applyAddresses(normalized, defaultAddress?.id ?? null, true);
      }),
    );
  }

  updateAddress(addressId: string, payload: AddressMutationPayload): Observable<Address[]> {
    return this.http.patch<unknown>(`${environment.apiUrl}/address/${addressId}`, payload).pipe(
      map((response) => this.extractAddressList(response)),
      tap((addresses) => {
        const normalized = this.normalizeAddresses(addresses);
        const currentSelectedId = this.selectedAddressSubject.value?.id ?? null;
        this.applyAddresses(normalized, currentSelectedId, true);
      }),
    );
  }

  deleteAddress(addressId: string): Observable<Address[]> {
    return this.http.delete<unknown>(`${environment.apiUrl}/address/${addressId}`).pipe(
      map((response) => this.extractAddressList(response)),
      tap((addresses) => {
        const normalized = this.normalizeAddresses(addresses);
        const selectedId = this.selectedAddressSubject.value?.id ?? null;
        const shouldKeepCurrent = selectedId !== addressId;
        this.applyAddresses(normalized, shouldKeepCurrent ? selectedId : null, true);
      }),
    );
  }

  private setAddressesFromAuth(addresses: Address[]): void {
    this.applyAddresses(this.normalizeAddresses(addresses));
  }

  private applyAddresses(
    addresses: Address[],
    preferredAddressId?: string | null,
    syncAuthUser = false,
  ): void {
    this.addressListSubject.next(addresses);
    if (syncAuthUser) {
      this.authService.updateLocalAddresses(addresses);
    }

    if (!addresses.length) {
      this.selectedAddressSubject.next(null);
      localStorage.removeItem(this.selectedAddressStorageKey);
      return;
    }

    const storedAddressId = this.readStoredSelectedAddressId();
    const currentSelectedId = this.selectedAddressSubject.value?.id ?? null;
    const fallbackDefaultId = addresses.find((item) => item.isDefault)?.id ?? addresses[0].id;

    const nextSelectedId =
      preferredAddressId ??
      currentSelectedId ??
      storedAddressId ??
      fallbackDefaultId;

    const nextSelected =
      addresses.find((item) => item.id === nextSelectedId) ??
      addresses.find((item) => item.isDefault) ??
      addresses[0];

    this.selectedAddressSubject.next(nextSelected);
    this.persistSelectedAddress(nextSelected);
  }

  private extractAddressList(response: unknown): Address[] {
    if (Array.isArray(response)) {
      return response as Address[];
    }

    if (!response || typeof response !== 'object') {
      return [];
    }

    const source = response as Record<string, unknown>;

    if (Array.isArray(source['data'])) {
      return source['data'] as Address[];
    }

    if (Array.isArray(source['addresses'])) {
      return source['addresses'] as Address[];
    }

    const nestedData = source['data'];
    if (!nestedData || typeof nestedData !== 'object') {
      return [];
    }

    const nested = nestedData as Record<string, unknown>;
    if (Array.isArray(nested['addresses'])) {
      return nested['addresses'] as Address[];
    }

    if (Array.isArray(nested['data'])) {
      return nested['data'] as Address[];
    }

    return [];
  }

  private normalizeAddresses(input: Address[]): Address[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((entry) => this.normalizeAddress(entry))
      .filter((address): address is Address => address !== null);
  }

  private normalizeAddress(entry: unknown): Address | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const source = entry as Record<string, unknown>;
    const id = this.readString(source, ['id']);
    const fullAddress = this.readString(source, ['fullAddress', 'address']) ?? '';

    if (!id || !fullAddress) {
      return null;
    }

    const shortAddress = this.readString(source, ['shortAddress']) ?? this.deriveShortAddress(fullAddress);
    const nowIso = new Date().toISOString();

    return {
      id,
      label: this.readString(source, ['label']) ?? 'Address',
      addressType: this.readString(source, ['addressType']) ?? 'HOME',
      contactName: this.readString(source, ['contactName', 'displayName']) ?? '',
      phone: this.readString(source, ['phone']) ?? '',
      shortAddress,
      fullAddress,
      location: this.readLocation(source['location']) ?? this.readLatLngFromRoot(source),
      isDefault: this.readBoolean(source, ['isDefault', 'default']) ?? false,
      createdAt: this.readString(source, ['createdAt', 'created_at']) ?? nowIso,
      updatedAt: this.readString(source, ['updatedAt', 'updated_at']) ?? nowIso,
      houseNumber: this.readString(source, ['houseNumber']) ?? undefined,
      building: this.readString(source, ['building']) ?? undefined,
      landmark: this.readString(source, ['landmark']) ?? undefined,
      area: this.readString(source, ['area']) ?? undefined,
      city: this.readString(source, ['city']) ?? undefined,
      state: this.readString(source, ['state']) ?? undefined,
      pincode: this.readString(source, ['pincode']) ?? undefined,
    };
  }

  private readStoredSelectedAddressId(): string | null {
    const rawValue = localStorage.getItem(this.selectedAddressStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawValue) as { id?: unknown };
      return typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : null;
    } catch {
      localStorage.removeItem(this.selectedAddressStorageKey);
      return null;
    }
  }

  private persistSelectedAddress(address: Address): void {
    localStorage.setItem(this.selectedAddressStorageKey, JSON.stringify(address));
  }

  private readLocation(locationValue: unknown): { lat: number; lng: number } | null {
    if (!locationValue || typeof locationValue !== 'object') {
      return null;
    }

    const location = locationValue as Record<string, unknown>;
    const lat = this.readNumber(location, ['lat']);
    const lng = this.readNumber(location, ['lng', 'lon', 'long']);
    return lat === null || lng === null ? null : { lat, lng };
  }

  private readLatLngFromRoot(source: Record<string, unknown>): { lat: number; lng: number } | null {
    const lat = this.readNumber(source, ['latitude', 'lat']);
    const lng = this.readNumber(source, ['longitude', 'lng', 'lon', 'long']);
    return lat === null || lng === null ? null : { lat, lng };
  }

  private deriveShortAddress(fullAddress: string): string {
    const firstPart = fullAddress.split(',')[0]?.trim() ?? '';
    return firstPart || fullAddress;
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
    return null;
  }

  private readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
    return null;
  }

  private readNumber(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }
}
