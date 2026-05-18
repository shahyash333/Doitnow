import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  personOutline,
  timeOutline,
} from 'ionicons/icons';
import { Observable } from 'rxjs';

import { NotificationsService } from '../../core/services/notifications.service';

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  isUnread: boolean;
  icon: keyof TabsAlertsPlaceholderComponent['icons'];
  colorClass: string;
}

@Component({
  standalone: true,
  selector: 'app-tabs-alerts-placeholder',
  imports: [CommonModule, IonicModule],
  templateUrl: './tabs-alerts-placeholder.component.html',
  styleUrls: ['./tabs-alerts-placeholder.component.scss'],
})
export class TabsAlertsPlaceholderComponent {
  readonly icons = {
    checkmarkCircleOutline,
    checkmarkDoneOutline,
    personOutline,
    timeOutline,
  };

  readonly notifications$: Observable<Notification[]>;

  constructor(private readonly notificationsService: NotificationsService) {
    addIcons(this.icons);
    this.notifications$ = this.notificationsService.notifications$ as Observable<Notification[]>;
  }

  ionViewWillEnter(): void {
    void this.notificationsService.syncInAppNotifications(true);
  }

  get unreadCount(): number {
    return this.notificationsService.notifications.filter((n) => n.isUnread).length;
  }

  readAll(): void {
    this.notificationsService.markAllAsRead();
  }

  openNotification(notificationId: string): void {
    void this.notificationsService.openNotification(notificationId);
  }
}
