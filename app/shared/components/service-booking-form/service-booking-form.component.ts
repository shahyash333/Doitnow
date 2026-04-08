import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
  serviceName: string;
  dateIso: string;
  dateLabel: string;
  timeSlotId: string;
  timeSlotLabel: string;
  addressId: string;
  addressLabel: string;
  addressText: string;
  price: number;
  note?: string;
}

@Component({
  selector: 'app-service-booking-form',
  templateUrl: './service-booking-form.component.html',
  styleUrls: ['./service-booking-form.component.scss'],
})
export class ServiceBookingFormComponent implements OnInit {
  @Input() serviceName = 'Service';
  @Input() startingPrice = 299;

  @Input() timeSlots: TimeSlotOption[] = [
    { id: 'morning', label: 'Morning', timeText: '8 AM - 11 AM' },
    { id: 'afternoon', label: 'Afternoon', timeText: '12 PM - 3 PM' },
    { id: 'evening', label: 'Evening', timeText: '4 PM - 7 PM' },
    { id: 'asap', label: 'ASAP', timeText: 'As soon as possible', description: 'Priority arrival' },
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
  selectedTimeSlotId = 'asap';
  selectedAddressId = '';
  isDatePickerOpen = false;
  note = '';

  constructor(
    private readonly actionSheetController: ActionSheetController,
  ) {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDateIso = this.toInputDate(today);

    const defaultAddress = this.addresses.find((address) => address.isDefault);
    this.selectedAddressId = defaultAddress?.id ?? this.addresses[0]?.id ?? '';

    if (!this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId) && this.timeSlots.length > 0) {
      this.selectedTimeSlotId = this.timeSlots[0].id;
    }
  }

  get selectedAddress(): AddressOption | undefined {
    return this.addresses.find((address) => address.id === this.selectedAddressId);
  }

  get selectedTimeSlot(): TimeSlotOption | undefined {
    return this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId);
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

    if (!selectedAddress || !selectedTimeSlot) {
      return;
    }

    this.requestService.emit({
      serviceName: this.serviceName,
      dateIso: this.selectedDateIso,
      dateLabel: this.selectedDateLabel,
      timeSlotId: selectedTimeSlot.id,
      timeSlotLabel: selectedTimeSlot.label,
      addressId: selectedAddress.id,
      addressLabel: selectedAddress.label,
      addressText: selectedAddress.fullAddress,
      price: this.startingPrice,
      note: this.note.trim() ? this.note.trim() : undefined,
    });
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
}
