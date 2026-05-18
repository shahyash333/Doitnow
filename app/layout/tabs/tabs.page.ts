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
import { NotificationsService } from '../../core/services/notifications.service';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
})
export class TabsPage implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  hideTabBar = false;
  activeTab: 'home' | 'requests' | 'alerts' | 'profile' | null = null;
  unreadCount = 0;

  readonly icons = {
    homeOutline,
    notificationsOutline,
    personOutline,
    receiptOutline,
  };

  constructor(
    private readonly router: Router,
    private readonly notificationsService: NotificationsService,
  ) {
    addIcons(this.icons);
    this.updateRouteState(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        this.updateRouteState(event.urlAfterRedirects);
      });

    this.notificationsService.unreadCount$.pipe(takeUntil(this.destroy$)).subscribe((count) => {
      this.unreadCount = count;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private isBookingRoute(url: string): boolean {
    return url.includes('/home/booking');
  }

  private updateRouteState(url: string): void {
    this.hideTabBar = this.isBookingRoute(url);
    this.activeTab = this.resolveActiveTab(url);
  }

  private resolveActiveTab(url: string): 'home' | 'requests' | 'alerts' | 'profile' | null {
    const normalizedUrl = url.split('?')[0].split('#')[0];

    if (normalizedUrl === '/home' || normalizedUrl === '/home/') {
      return 'home';
    }

    if (normalizedUrl.startsWith('/home/requests')) {
      return 'requests';
    }

    if (normalizedUrl.startsWith('/home/alerts')) {
      return 'alerts';
    }

    if (normalizedUrl.startsWith('/home/profile')) {
      return 'profile';
    }

    return null;
  }
}
