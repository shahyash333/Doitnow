import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkOutline, closeOutline } from 'ionicons/icons';

import { ServiceAddonGroup } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-booking-addons-sheet',
  templateUrl: './booking-addons-sheet.component.html',
  styleUrls: ['./booking-addons-sheet.component.scss'],
})
export class BookingAddonsSheetComponent implements OnInit {
  @Input() addonGroups: ServiceAddonGroup[] = [];
  @Input() startingPrice = 0;
  @Input() initialSelectedAddonIds: string[] = [];

  readonly selectedAddonIds = new Set<string>();
  validationMessage = '';

  readonly icons = {
    checkmarkOutline,
    closeOutline,
  };

  constructor(private readonly modalController: ModalController) {
    addIcons(this.icons);
  }

  ngOnInit(): void {
    for (const addonId of this.initialSelectedAddonIds) {
      this.selectedAddonIds.add(addonId);
    }
  }

  get addonsTotal(): number {
    return this.addonGroups.reduce((sum, group) => {
      return (
        sum +
        group.addons
          .filter((addon) => this.selectedAddonIds.has(addon.id))
          .reduce((groupSum, addon) => groupSum + addon.price, 0)
      );
    }, 0);
  }

  get estimatedTotal(): number {
    return this.startingPrice + this.addonsTotal;
  }

  get selectedSummary(): string {
    const labels = this.addonGroups.flatMap((group) =>
      group.addons.filter((addon) => this.selectedAddonIds.has(addon.id)).map((addon) => addon.label),
    );

    if (!labels.length) {
      return 'None selected';
    }

    return labels.join(', ');
  }

  isSelected(addonId: string): boolean {
    return this.selectedAddonIds.has(addonId);
  }

  toggleAddon(group: ServiceAddonGroup, addonId: string): void {
    this.validationMessage = '';

    if (group.selectionType === 'SINGLE') {
      for (const addon of group.addons) {
        this.selectedAddonIds.delete(addon.id);
      }
      this.selectedAddonIds.add(addonId);
      return;
    }

    if (this.selectedAddonIds.has(addonId)) {
      this.selectedAddonIds.delete(addonId);
      return;
    }

    const selectedInGroup = group.addons.filter((addon) => this.selectedAddonIds.has(addon.id)).length;
    if (group.maxSelection !== null && selectedInGroup >= group.maxSelection) {
      this.validationMessage = `You can select at most ${group.maxSelection} option(s) for ${group.title}.`;
      return;
    }

    this.selectedAddonIds.add(addonId);
  }

  get canSave(): boolean {
    return this.validateSelection() === null;
  }

  get saveHint(): string {
    return this.validateSelection() ?? 'Complete required selections to continue.';
  }

  save(): void {
    const validationError = this.validateSelection();
    if (validationError) {
      this.validationMessage = validationError;
      return;
    }

    void this.modalController.dismiss(Array.from(this.selectedAddonIds), 'save');
  }

  close(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  groupHint(group: ServiceAddonGroup): string {
    if (group.helpText?.trim()) {
      return group.helpText.trim();
    }

    if (group.isRequired || group.minSelection > 0) {
      const min = Math.max(group.minSelection, group.isRequired ? 1 : 0);
      if (group.selectionType === 'SINGLE') {
        return 'Choose one option';
      }
      return min === 1 ? 'Choose at least one option' : `Choose at least ${min} options`;
    }

    return group.selectionType === 'SINGLE' ? 'Optional — choose one' : 'Optional';
  }

  private validateSelection(): string | null {
    for (const group of this.addonGroups) {
      const selectedCount = group.addons.filter((addon) => this.selectedAddonIds.has(addon.id)).length;
      const minRequired = group.isRequired
        ? Math.max(group.minSelection, 1)
        : group.minSelection;

      if (selectedCount < minRequired) {
        return `Please select at least ${minRequired} option(s) for ${group.title}.`;
      }

      if (group.maxSelection !== null && selectedCount > group.maxSelection) {
        return `You can select at most ${group.maxSelection} option(s) for ${group.title}.`;
      }

      if (group.selectionType === 'SINGLE' && selectedCount > 1) {
        return `Only one option can be selected for ${group.title}.`;
      }
    }

    return null;
  }
}
