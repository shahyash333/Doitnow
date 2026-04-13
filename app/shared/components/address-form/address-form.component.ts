import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { closeOutline, locationOutline, navigateOutline, saveOutline } from 'ionicons/icons';

import { Address, AddressLocation, AddressMutationPayload } from '../../../core/models/address.model';
import { GeocodingService, ReverseGeocodeResult } from '../../../core/services/geocoding.service';

type AddressType = 'HOME' | 'WORK' | 'OTHER';

@Component({
  selector: 'app-address-form',
  templateUrl: './address-form.component.html',
  styleUrls: ['./address-form.component.scss'],
})
export class AddressFormComponent implements OnChanges {
  @Input() mode: 'add' | 'edit' = 'add';
  @Input() initialAddress: Address | null = null;
  @Input() isSubmitting = false;

  @Output() save = new EventEmitter<AddressMutationPayload>();
  @Output() cancel = new EventEmitter<void>();

  readonly addressTypes: AddressType[] = ['HOME', 'WORK', 'OTHER'];
  readonly icons = {
    closeOutline,
    locationOutline,
    navigateOutline,
    saveOutline,
  };

  readonly form = this.formBuilder.nonNullable.group({
    label: ['', [Validators.required]],
    addressType: ['HOME' as AddressType, [Validators.required]],
    contactName: [''],
    phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    houseNumber: [''],
    building: ['', [Validators.required]],
    landmark: ['', [Validators.required]],
    area: [''],
    city: ['', [Validators.required]],
    state: ['', [Validators.required]],
    pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    isDefault: [false],
  });

  isResolvingLocation = false;
  locationMessage = '';
  isLocationError = false;
  private pickedLocation: AddressLocation | null = null;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly geocodingService: GeocodingService,
  ) {
    addIcons(this.icons);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('initialAddress' in changes || 'mode' in changes) {
      this.applyInitialState();
    }
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  hasError(controlName: keyof typeof this.form.controls, errorKey: string): boolean {
    const control = this.form.controls[controlName];
    return Boolean(control.touched && control.hasError(errorKey));
  }

  onPhoneInput(value: string): void {
    const sanitized = (value ?? '').replace(/\D/g, '').slice(0, 10);
    this.form.controls.phone.setValue(sanitized, { emitEvent: false });
  }

  onPincodeInput(value: string): void {
    const sanitized = (value ?? '').replace(/\D/g, '').slice(0, 6);
    this.form.controls.pincode.setValue(sanitized, { emitEvent: false });
  }

  async useCurrentLocation(): Promise<void> {
    this.isLocationError = false;
    this.locationMessage = '';

    if (!('geolocation' in navigator)) {
      this.isLocationError = true;
      this.locationMessage = 'Location access is unavailable on this device.';
      return;
    }

    const deniedByPermissionApi = await this.isGeolocationDeniedByBrowser();
    if (deniedByPermissionApi) {
      this.isLocationError = true;
      this.locationMessage = 'Location access denied. Please enter manually.';
      return;
    }

    this.isResolvingLocation = true;
    try {
      const position = await this.getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      this.pickedLocation = { lat, lng };

      const locationDetails = await firstValueFrom(this.geocodingService.reverseGeocode(lat, lng));
      this.patchLocationDetails(locationDetails);
      this.locationMessage = 'Location fetched. You can edit details before saving.';
      this.isLocationError = false;
    } catch (error) {
      const deniedByBrowserPrompt =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as GeolocationPositionError).code === 1;

      if (deniedByBrowserPrompt) {
        this.isLocationError = true;
        this.locationMessage = 'Location access denied. Please enter manually.';
      } else {
        this.isLocationError = true;
        this.locationMessage = 'Unable to fetch location. Please enter address manually.';
      }
    } finally {
      this.isResolvingLocation = false;
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const normalizedPhone = value.phone.replace(/\D/g, '').slice(0, 10);
    const latitude = this.pickedLocation?.lat;
    const longitude = this.pickedLocation?.lng;

    this.save.emit({
      label: value.label.trim(),
      addressType: value.addressType,
      contactName: value.contactName.trim(),
      phone: normalizedPhone,
      houseNumber: value.houseNumber.trim(),
      building: value.building.trim(),
      landmark: value.landmark.trim(),
      area: value.area.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      pincode: value.pincode.trim(),
      latitude,
      longitude,
      isDefault: Boolean(value.isDefault),
    });
  }

  private applyInitialState(): void {
    if (!this.initialAddress) {
      this.form.reset(
        {
          label: '',
          addressType: 'HOME',
          contactName: '',
          phone: '',
          houseNumber: '',
          building: '',
          landmark: '',
          area: '',
          city: '',
          state: '',
          pincode: '',
          isDefault: false,
        },
        { emitEvent: false },
      );
      this.pickedLocation = null;
      this.locationMessage = '';
      this.isLocationError = false;
      return;
    }

    const defaults = this.deriveAddressFormDefaults(this.initialAddress);
    this.form.reset(defaults, { emitEvent: false });
    this.pickedLocation = this.initialAddress.location;
    this.locationMessage = '';
    this.isLocationError = false;
  }

  private patchLocationDetails(locationDetails: ReverseGeocodeResult): void {
    const current = this.form.getRawValue();
    this.form.patchValue(
      {
        houseNumber: locationDetails.houseNumber || current.houseNumber,
        building: locationDetails.building || current.building,
        landmark: locationDetails.landmark || current.landmark,
        area: locationDetails.area || current.area,
        city: locationDetails.city || current.city,
        state: locationDetails.state || current.state,
        pincode: locationDetails.pincode || current.pincode,
      },
      { emitEvent: false },
    );
  }

  private deriveAddressFormDefaults(address: Address): {
    label: string;
    addressType: AddressType;
    contactName: string;
    phone: string;
    houseNumber: string;
    building: string;
    landmark: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  } {
    const parts = address.fullAddress
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const finalPart = parts.at(-1) ?? '';
    const pinMatch = finalPart.match(/\b(\d{6})\b/);
    const parsedPincode = pinMatch?.[1] ?? '';
    const parsedState = finalPart.replace(parsedPincode, '').trim();

    const normalizedAddressType = address.addressType?.toUpperCase();
    const addressType: AddressType =
      normalizedAddressType === 'WORK' || normalizedAddressType === 'OTHER' ? normalizedAddressType : 'HOME';

    return {
      label: address.label ?? '',
      addressType,
      contactName: address.contactName ?? '',
      phone: (address.phone ?? '').replace(/\D/g, '').slice(0, 10),
      houseNumber: address.houseNumber ?? parts[0] ?? '',
      building: address.building ?? parts[1] ?? address.shortAddress ?? '',
      landmark: address.landmark ?? parts[2] ?? address.shortAddress ?? '',
      area: address.area ?? parts[3] ?? '',
      city: address.city ?? parts.at(-2) ?? '',
      state: address.state ?? parsedState,
      pincode: address.pincode ?? parsedPincode,
      isDefault: Boolean(address.isDefault),
    };
  }

  private async isGeolocationDeniedByBrowser(): Promise<boolean> {
    if (!navigator.permissions?.query) {
      return false;
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state === 'denied';
    } catch {
      return false;
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
    });
  }
}
