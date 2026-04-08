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

  notifications: Notification[] = [
    {
      id: '1',
      title: 'Request Approved',
      description: 'Your medicine pickup request has been approved. Worker assigned.',
      timestamp: '2 hours ago',
      isUnread: true,
      icon: 'checkmarkCircleOutline',
      colorClass: 'mint',
    },
    {
      id: '2',
      title: 'Worker Assigned',
      description: 'Vijay Kumar will handle your medicine pickup today at 4 PM.',
      timestamp: '2 hours ago',
      isUnread: true,
      icon: 'personOutline',
      colorClass: 'lavender',
    },
    {
      id: '3',
      title: 'Service Completed',
      description: 'Your home cleaning service has been marked as completed.',
      timestamp: 'Yesterday',
      isUnread: false,
      icon: 'timeOutline',
      colorClass: 'amber',
    },
  ];

  constructor() {
    addIcons(this.icons);
  }

  get unreadCount(): number {
    return this.notifications.filter((n) => n.isUnread).length;
  }

  readAll(): void {
    this.notifications.forEach((notification) => {
      notification.isUnread = false;
    });
  }
}
