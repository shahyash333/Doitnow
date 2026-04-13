import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkOutline,
  chevronForwardOutline,
  homeOutline,
  locationOutline,
  timeOutline,
} from 'ionicons/icons';

export interface AddressOption {
  id: string;
  label: string;
  fullAddress: string;
  isDefault?: boolean;
}

export interface TimeSlotOption {
  id: string;
  label: string;
  timeText: string;
  description?: string;
}

export interface ServiceBookingPayload {
  serviceId?: string;
  serviceSlug?: string;
  serviceName: string;
  dateIso: string;
  dateLabel: string;
  timeSlotId: string;
  timeSlotLabel: string;
  addressId: string;
  addressLabel: string;
  addressText: string;
  price: number;
  phone: string;
  notes?: string;
}

@Component({
  selector: 'app-service-booking-form',
  templateUrl: './service-booking-form.component.html',
  styleUrls: ['./service-booking-form.component.scss'],
})
export class ServiceBookingFormComponent implements OnInit, OnChanges {
  @Input() serviceId: string | null = null;
  @Input() serviceSlug: string | null = null;
  @Input() serviceName = 'Service';
  @Input() startingPrice = 299;
  @Input() initialPhone: string | null = null;
  @Input() isSubmitting = false;

  @Input() timeSlots: TimeSlotOption[] = [
    { id: 'morning', label: 'Morning', timeText: '8 AM - 11 AM' },
    { id: 'afternoon', label: 'Afternoon', timeText: '12 PM - 3 PM' },
    { id: 'evening', label: 'Evening', timeText: '4 PM - 7 PM' },
  ];

  @Input() addresses: AddressOption[] = [
    {
      id: 'home',
      label: 'Home',
      fullAddress: '12, Shanti Nagar, Satellite Road, Ahmedabad - 380015',
      isDefault: true,
    },
    {
      id: 'office',
      label: 'Office',
      fullAddress: '3rd Floor, Sigma Plaza, SG Highway, Ahmedabad - 380054',
    },
  ];

  @Output() requestService = new EventEmitter<ServiceBookingPayload>();

  readonly icons = {
    calendarOutline,
    checkmarkOutline,
    chevronForwardOutline,
    homeOutline,
    locationOutline,
    timeOutline,
  };

  selectedDateIso = '';
  selectedTimeSlotId = 'morning';
  selectedAddressId = '';
  isDatePickerOpen = false;
  notes = '';
  phone = '';
  showPhoneError = false;

  constructor(
    private readonly actionSheetController: ActionSheetController,
  ) {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDateIso = this.toInputDate(today);

    this.ensureSelectedAddress();

    if (!this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId) && this.timeSlots.length > 0) {
      this.selectedTimeSlotId = this.timeSlots[0].id;
    }

    this.applyInitialPhone(this.initialPhone);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('initialPhone' in changes && !this.phone.trim()) {
      this.applyInitialPhone(changes['initialPhone'].currentValue as string | null);
    }

    if ('addresses' in changes) {
      this.ensureSelectedAddress();
    }
  }

  get selectedAddress(): AddressOption | undefined {
    return this.addresses.find((address) => address.id === this.selectedAddressId);
  }

  get selectedTimeSlot(): TimeSlotOption | undefined {
    return this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId);
  }

  get hasAddresses(): boolean {
    return this.addresses.length > 0;
  }

  get selectedDateLabel(): string {
    const selectedDate = this.parseInputDate(this.selectedDateIso);
    const today = new Date();
    const isToday =
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate();

    const formatted = selectedDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });

    if (isToday) {
      return `Today, ${formatted}`;
    }

    const weekday = selectedDate.toLocaleDateString('en-IN', { weekday: 'short' });
    return `${weekday}, ${formatted}`;
  }

  get minDateIso(): string {
    return this.toInputDate(new Date());
  }

  get normalizedPhone(): string {
    return this.normalizeIndianPhone(this.phone);
  }

  get isPhoneValid(): boolean {
    return /^[6-9]\d{9}$/.test(this.normalizedPhone);
  }

  get phoneErrorMessage(): string {
    if (!this.showPhoneError) {
      return '';
    }

    if (!this.phone.trim()) {
      return 'Phone number is required.';
    }

    return 'Please enter a valid Indian mobile number.';
  }

  onDateSelected(event: any): void {
    const value = event?.detail?.value;
    if (typeof value !== 'string' || !value) {
      return;
    }
    this.selectedDateIso = value.slice(0, 10);
    this.isDatePickerOpen = false;
  }

  selectTimeSlot(slotId: any): void {
    if (typeof slotId !== 'string' || !slotId) return;
    this.selectedTimeSlotId = slotId;
  }

  onPhoneInput(value: string): void {
    this.phone = value;
    if (this.showPhoneError) {
      this.showPhoneError = !this.isPhoneValid;
    }
  }

  async openAddressChange(): Promise<void> {
    const buttons: Array<{ text: string; handler?: () => void; role?: 'cancel' }> =
      this.addresses.map((address) => ({
        text: address.id === this.selectedAddressId ? `${address.label} (Selected)` : address.label,
        handler: () => {
          this.selectedAddressId = address.id;
        },
      }));

    buttons.push({
      text: 'Cancel',
      role: 'cancel',
    });

    const actionSheet = await this.actionSheetController.create({
      header: 'Select Address',
      buttons,
    });

    await actionSheet.present();
  }

  submitRequest(): void {
    const selectedAddress = this.selectedAddress;
    const selectedTimeSlot = this.selectedTimeSlot;
    this.showPhoneError = !this.isPhoneValid;

    if (!selectedAddress || !selectedTimeSlot || !this.isPhoneValid) {
      return;
    }

    this.requestService.emit({
      serviceId: this.serviceId ?? undefined,
      serviceSlug: this.serviceSlug ?? undefined,
      serviceName: this.serviceName,
      dateIso: this.selectedDateIso,
      dateLabel: this.selectedDateLabel,
      timeSlotId: selectedTimeSlot.id,
      timeSlotLabel: selectedTimeSlot.label,
      addressId: selectedAddress.id,
      addressLabel: selectedAddress.label,
      addressText: selectedAddress.fullAddress,
      price: this.startingPrice,
      phone: this.normalizedPhone,
      notes: this.notes.trim() ? this.notes.trim() : undefined,
    });
  }

  private applyInitialPhone(phone: string | null): void {
    if (!phone) {
      return;
    }
    this.phone = this.normalizeIndianPhone(phone);
  }

  private ensureSelectedAddress(): void {
    if (!this.addresses.length) {
      this.selectedAddressId = '';
      return;
    }

    const selectedStillExists = this.addresses.some((address) => address.id === this.selectedAddressId);
    if (selectedStillExists) {
      return;
    }

    const defaultAddress = this.addresses.find((address) => address.isDefault);
    this.selectedAddressId = defaultAddress?.id ?? this.addresses[0]?.id ?? '';
  }

  private toInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseInputDate(inputDate: string): Date {
    const [year, month, day] = inputDate.split('-').map((part) => Number(part));
    return new Date(year, month - 1, day);
  }

  private normalizeIndianPhone(input: string): string {
    const digitsOnly = (input ?? '').replace(/\D/g, '');
    if (!digitsOnly) {
      return '';
    }

    if (digitsOnly.length === 10) {
      return digitsOnly;
    }

    if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      return digitsOnly.slice(1);
    }

    if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      return digitsOnly.slice(2);
    }

    return digitsOnly;
  }
}
