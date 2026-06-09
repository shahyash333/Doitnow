import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  checkmarkOutline,
  chevronForwardOutline,
  homeOutline,
  listOutline,
  moonOutline,
  navigateOutline,
  partlySunnyOutline,
  sunnyOutline,
  timeOutline,
  timerOutline,
} from 'ionicons/icons';

import { Address } from '../../../core/models/address.model';
import { ServiceAddonGroup } from '../../../core/services/catalog.service';
import { BookingAddonsSheetComponent } from '../booking-addons-sheet/booking-addons-sheet.component';

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
  selectedAddonIds: string[];
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
  @Input() addonGroups: ServiceAddonGroup[] = [];
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
    chevronForwardOutline,
    homeOutline,
    listOutline,
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
  selectedAddonIds: string[] = [];
  addonValidationMessage = '';

  constructor(private readonly modalController: ModalController) {
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

    if ('addonGroups' in changes) {
      this.selectedAddonIds = this.selectedAddonIds.filter((addonId) =>
        this.addonGroups.some((group) => group.addons.some((addon) => addon.id === addonId)),
      );
    }
  }

  get hasAddonGroups(): boolean {
    return this.addonGroups.some((group) => group.addons.length > 0);
  }

  get selectedTimeSlot(): TimeSlotOption | undefined {
    return this.timeSlots.find((slot) => slot.id === this.selectedTimeSlotId);
  }

  get hasAddress(): boolean {
    return Boolean(this.selectedAddress?.id);
  }

  get addonsTotal(): number {
    return this.addonGroups.reduce((sum, group) => {
      return (
        sum +
        group.addons
          .filter((addon) => this.selectedAddonIds.includes(addon.id))
          .reduce((groupSum, addon) => groupSum + addon.price, 0)
      );
    }, 0);
  }

  get totalPrice(): number {
    return this.startingPrice + this.addonsTotal;
  }

  get selectedAddonLabels(): string {
    const labels = this.addonGroups.flatMap((group) =>
      group.addons.filter((addon) => this.selectedAddonIds.includes(addon.id)).map((addon) => addon.label),
    );

    if (!labels.length) {
      return this.hasAddonGroups ? 'Tap to choose options' : '';
    }

    return labels.join(', ');
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

  get areAddonsValid(): boolean {
    if (!this.hasAddonGroups) {
      return true;
    }

    return this.validateAddonSelection() === null;
  }

  get canSubmit(): boolean {
    return (
      this.hasAddress &&
      Boolean(this.selectedTimeSlot) &&
      Boolean(this.selectedDateIso) &&
      this.areAddonsValid &&
      !this.isSubmitting
    );
  }

  get submitHint(): string {
    if (!this.hasAddress) {
      return 'Add a service address to continue.';
    }

    if (!this.areAddonsValid) {
      return 'Choose required service options to continue.';
    }

    return '';
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

  async openAddonsSheet(): Promise<void> {
    const modal = await this.modalController.create({
      component: BookingAddonsSheetComponent,
      componentProps: {
        addonGroups: this.addonGroups,
        startingPrice: this.startingPrice,
        initialSelectedAddonIds: [...this.selectedAddonIds],
      },
      cssClass: 'booking-addons-modal',
      breakpoints: [0, 0.6, 0.88],
      initialBreakpoint: 0.88,
      expandToScroll: false,
      backdropDismiss: true,
      handle: true,
    });

    await modal.present();
    const { data, role } = await modal.onDidDismiss<string[]>();

    if (role === 'save' && Array.isArray(data)) {
      this.selectedAddonIds = data;
      this.addonValidationMessage = '';
    }
  }

  submitRequest(): void {
    if (!this.selectedAddress || !this.selectedTimeSlot) {
      return;
    }

    const addonError = this.validateAddonSelection();
    if (addonError) {
      this.addonValidationMessage = addonError;
      return;
    }

    this.addonValidationMessage = '';
    this.requestService.emit({
      serviceId: this.serviceId ?? undefined,
      serviceSlug: this.serviceSlug ?? undefined,
      serviceName: this.serviceName,
      dateIso: this.selectedDateIso,
      dateLabel: this.selectedDateLabel,
      timeSlotId: this.selectedTimeSlot.id,
      timeSlotLabel: this.selectedTimeSlot.label,
      addressId: this.selectedAddress.id,
      price: this.totalPrice,
      selectedAddonIds: [...this.selectedAddonIds],
      notes: this.notes.trim() ? this.notes.trim() : undefined,
    });
  }

  private validateAddonSelection(): string | null {
    for (const group of this.addonGroups) {
      const selectedCount = group.addons.filter((addon) => this.selectedAddonIds.includes(addon.id)).length;
      const minRequired = group.isRequired ? Math.max(group.minSelection, 1) : group.minSelection;

      if (selectedCount < minRequired) {
        return `Please choose options for ${group.title}.`;
      }

      if (group.maxSelection !== null && selectedCount > group.maxSelection) {
        return `Too many options selected for ${group.title}.`;
      }

      if (group.selectionType === 'SINGLE' && selectedCount > 1) {
        return `Only one option can be selected for ${group.title}.`;
      }
    }

    return null;
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
