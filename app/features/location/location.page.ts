import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { chevronBackOutline, checkmarkOutline } from 'ionicons/icons';

@Component({
  selector: 'app-location',
  templateUrl: './location.page.html',
  styleUrls: ['./location.page.scss'],
})
export class LocationPage {
  readonly icons = {
    chevronBackOutline,
    checkmarkOutline,
  };

  readonly locations: string[] = [
    'Satellite, Ahmedabad',
    'Bopal, Ahmedabad',
    'Navrangpura, Ahmedabad',
    'Thaltej, Ahmedabad',
  ];

  selected = this.locations[0];

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
  ) {
    addIcons(this.icons);
    this.selected = this.route.snapshot.queryParamMap.get('current') ?? this.selected;
  }

  back(): void {
    this.router.navigate(['/home/home']);
  }

  choose(loc: string): void {
    this.selected = loc;
    this.router.navigate(['/home/home'], { queryParams: { location: loc } });
  }
}

