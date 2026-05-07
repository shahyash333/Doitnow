import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkOutline,
  homeOutline,
  locationOutline,
  moonOutline,
  navigateOutline,
  partlySunnyOutline,
  sunnyOutline,
  timeOutline,
  timerOutline,
} from 'ionicons/icons';

import { Address } from '../../../core/models/address.model';

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
  price: number;
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
  @Input() isSubmitting = false;
  @Input() selectedAddress: Address | null = null;

  @Input() timeSlots: TimeSlotOption[] = [
    { id: 'asap', label: 'ASAP', timeText: 'Within 60 mins', description: 'Earliest available professional' },
    { id: 'morning', label: 'Morning', timeText: '8 AM - 11 AM' },
    { id: 'afternoon', label: 'Afternoon', timeText: '12 PM - 3 PM' },
    { id: 'evening', label: 'Evening', timeText: '4 PM - 7 PM' },
  ];

  @Output() requestService = new EventEmitter<ServiceBookingPayload>();
  @Output() changeAddress = new EventEmitter<void>();
  @Output() addAddress = new EventEmitter<void>();

  readonly icons = {
    calendarOutline,
    checkmarkOutline,
    homeOutline,
    locationOutline,
    moonOutline,
    navigateOutline,
    partlySunnyOutline,
    sunnyOutline,
    timeOutline,
    timerOutline,
  };

  selectedDateIso = '';
  selectedTimeSlotId = 'asap';
  isDatePickerOpen = false;
  notes = '';

  constructor() {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    const today = new Date();
    this.selectedDateIso = this.toInputDate(today);

    if (!this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId) && this.timeSlots.length > 0) {
      this.selectedTimeSlotId = this.timeSlots[0].id;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('timeSlots' in changes) {
      const selectedExists = this.timeSlots.some((slot) => slot.id === this.selectedTimeSlotId);
      if (!selectedExists && this.timeSlots.length > 0) {
        this.selectedTimeSlotId = this.timeSlots[0].id;
      }
    }
  }

  get selectedTimeSlot(): TimeSlotOption | undefined {
    return this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId);
  }

  get hasAddress(): boolean {
    return Boolean(this.selectedAddress?.id);
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

  get maxDateIso(): string {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    return this.toInputDate(maxDate);
  }

  onDateSelected(event: { detail?: { value?: string | string[] | null } }): void {
    const value = event?.detail?.value;
    const dateValue = Array.isArray(value) ? value[0] : value;
    if (typeof dateValue !== 'string' || !dateValue) {
      return;
    }
    this.selectedDateIso = dateValue.slice(0, 10);
    this.isDatePickerOpen = false;
  }

  selectTimeSlot(slotId: string | null): void {
    if (!slotId) {
      return;
    }
    this.selectedTimeSlotId = slotId;
  }

  getTimeSlotIcon(slotId: string) {
    switch (slotId) {
      case 'asap':
        return this.icons.timerOutline;
      case 'morning':
        return this.icons.sunnyOutline;
      case 'afternoon':
        return this.icons.partlySunnyOutline;
      case 'evening':
        return this.icons.moonOutline;
      default:
        return this.icons.timeOutline;
    }
  }

  submitRequest(): void {
    if (!this.selectedAddress || !this.selectedTimeSlot) {
      return;
    }

    this.requestService.emit({
      serviceId: this.serviceId ?? undefined,
      serviceSlug: this.serviceSlug ?? undefined,
      serviceName: this.serviceName,
      dateIso: this.selectedDateIso,
      dateLabel: this.selectedDateLabel,
      timeSlotId: this.selectedTimeSlot.id,
      timeSlotLabel: this.selectedTimeSlot.label,
      addressId: this.selectedAddress.id,
      price: this.startingPrice,
      notes: this.notes.trim() ? this.notes.trim() : undefined,
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
