import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  homeOutline,
  notificationsOutline,
  personOutline,
  receiptOutline,
} from 'ionicons/icons';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  hideTabBar = false;

  readonly icons = {
    homeOutline,
    notificationsOutline,
    personOutline,
    receiptOutline,
  };

  constructor(private readonly router: Router) {
    addIcons(this.icons);
    this.hideTabBar = this.isBookingRoute(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        this.hideTabBar = this.isBookingRoute(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isBookingRoute(url: string): boolean {
    return url.includes('/home/booking');
  }
}
