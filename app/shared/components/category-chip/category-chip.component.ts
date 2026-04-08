import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-category-chip',
  templateUrl: './category-chip.component.html',
  styleUrls: ['./category-chip.component.scss'],
})
export class CategoryChipComponent {
  @Input() label = '';
  @Output() select = new EventEmitter<void>();
}
