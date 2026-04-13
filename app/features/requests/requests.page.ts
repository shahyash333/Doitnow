import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  buildOutline,
  carOutline,
  chevronForwardOutline,
  checkmarkCircleOutline,
  medicalOutline,
  sparklesOutline,
  starOutline,
  timeOutline,
} from 'ionicons/icons';

interface Request {
  id: string;
  title: string;
  description: string;
  icon: keyof RequestsPage['icons'];
  colorClass: string;
  status: 'pending' | 'approved' | 'completed';
  statusLabel: string;
  statusIcon: keyof RequestsPage['icons'];
}

@Component({
  selector: 'app-requests',
  templateUrl: './requests.page.html',
  styleUrls: ['./requests.page.scss'],
})
export class RequestsPage {
  activeTab: string = 'all';

  readonly icons = {
    buildOutline,
    carOutline,
    chevronForwardOutline,
    checkmarkCircleOutline,
    medicalOutline,
    sparklesOutline,
    starOutline,
    timeOutline,
  };

  requests: Request[] = [
    {
      id: '1',
      title: 'Medicine Pickup',
      description: 'Need blood pressure tablets from Apollo Pharmacy...',
      icon: 'medicalOutline',
      colorClass: 'mint',
      status: 'approved',
      statusLabel: 'Approved',
      statusIcon: 'checkmarkCircleOutline',
    },
    {
      id: '2',
      title: 'Home Cleaning',
      description: 'Full house cleaning needed',
      icon: 'sparklesOutline',
      colorClass: 'sky',
      status: 'pending',
      statusLabel: 'Pending',
      statusIcon: 'timeOutline',
    },
    {
      id: '3',
      title: 'Cooking',
      description: 'Lunch preparation for 4 people',
      icon: 'buildOutline',
      colorClass: 'peach',
      status: 'completed',
      statusLabel: 'Completed',
      statusIcon: 'starOutline',
    },
    {
      id: '4',
      title: 'Car Wash',
      description: 'Full exterior and interior wash needed...',
      icon: 'carOutline',
      colorClass: 'sand',
      status: 'pending',
      statusLabel: 'Pending',
      statusIcon: 'timeOutline',
    },
  ];

  get filteredRequests(): Request[] {
    if (this.activeTab === 'all') {
      return this.requests;
    }
    return this.requests.filter((req) => req.status === this.activeTab);
  }

  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  constructor(private readonly router: Router) {
    addIcons(this.icons);
  }

  viewDetails(request: Request): void {
    this.router.navigate(['/home/booking'], {
      queryParams: {
        service: request.title,
      },
    });
  }

  performAction(request: Request): void {
    console.log('Action for:', request);
    // Handle cancel or rebook
  }
}
