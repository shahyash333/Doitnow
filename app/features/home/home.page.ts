import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  chevronBackOutline,
  chevronDownOutline,
  chevronForwardOutline,
  constructOutline,
  fastFoodOutline,
  flashOutline,
  hammerOutline,
  locationOutline,
  medicalOutline,
  notificationsOutline,
  pawOutline,
  restaurantOutline,
  searchOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  star,
} from 'ionicons/icons';

type ServiceIcon =
  | 'constructOutline'
  | 'fastFoodOutline'
  | 'flashOutline'
  | 'hammerOutline'
  | 'medicalOutline'
  | 'pawOutline'
  | 'restaurantOutline'
  | 'sparklesOutline';

interface PopularService {
  title: string;
  subtitle: string;
  priceText: string;
  rating: string;
  icon: ServiceIcon;
  badge?: string;
  image: string;
}

interface ServiceItem {
  title: string;
  subtitle: string;
  icon: ServiceIcon;
  colorClass: string;
  featured?: boolean;
  priceText: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  @ViewChild('popularScroller') popularScroller?: ElementRef<HTMLDivElement>;

  readonly icons = {
    arrowForwardOutline,
    chevronBackOutline,
    chevronDownOutline,
    chevronForwardOutline,
    constructOutline,
    fastFoodOutline,
    flashOutline,
    hammerOutline,
    locationOutline,
    medicalOutline,
    notificationsOutline,
    pawOutline,
    restaurantOutline,
    searchOutline,
    shieldCheckmarkOutline,
    sparklesOutline,
    star,
  };

  constructor(private readonly router: Router) {
    addIcons(this.icons);
  }

  activePopularIndex = 0;

  readonly popularServices: PopularService[] = [
    {
      title: 'Home Cleaning',
      subtitle: 'Deep & regular cleaning',
      priceText: 'From ₹399',
      rating: '4.8 (1.2K)',
      icon: 'sparklesOutline',
      badge: 'Popular',
      image: 'assets/imgs/homeCleaning.png',
    },
    {
      title: 'Cook at Home',
      subtitle: 'Fresh meals at home',
      priceText: 'From ₹249',
      rating: '4.7 (956)',
      icon: 'restaurantOutline',
      badge: 'Fast',
      image: 'assets/imgs/cooking.png',
    },
    {
      title: 'Plumbing',
      subtitle: 'Repairs & fittings',
      priceText: 'From ₹299',
      rating: '4.6 (812)',
      icon: 'constructOutline',
      image: 'assets/imgs/plumbing.png',
    },
    {
      title: 'Electrician',
      subtitle: 'Wiring & repairs',
      priceText: 'From ₹299',
      rating: '4.7 (732)',
      icon: 'flashOutline',
      badge: 'Top Rated',
      image: 'assets/imgs/electrician.png',
    },
  ];

  readonly allServices: ServiceItem[] = [
    {
      title: 'Medicine Pickup',
      subtitle: 'Pickup & delivery of medicines',
      icon: 'medicalOutline',
      colorClass: 'mint',
      priceText: 'From ₹29',
    },
    {
      title: 'Food Pickup',
      subtitle: 'From local shops & restaurants',
      icon: 'fastFoodOutline',
      colorClass: 'peach',
      priceText: 'From ₹49',
    },
    {
      title: 'Dog Walking',
      subtitle: 'Daily walks for your pet',
      icon: 'pawOutline',
      colorClass: 'lavender',
      featured: true,
      priceText: 'From ₹199',
    },
    {
      title: 'Home Cleaning',
      subtitle: 'Deep & regular cleaning',
      icon: 'sparklesOutline',
      colorClass: 'blue',
      priceText: 'From ₹399',
    },
    {
      title: 'Household Chores',
      subtitle: 'General household help',
      icon: 'hammerOutline',
      colorClass: 'rose',
      priceText: 'From ₹149',
    },
    {
      title: 'Cooking',
      subtitle: '1-2 hours of meal prep',
      icon: 'restaurantOutline',
      colorClass: 'orange',
      priceText: 'From ₹249',
    },
    {
      title: 'Plumbing',
      subtitle: 'Leaks, taps & pipe work',
      icon: 'constructOutline',
      colorClass: 'steel',
      priceText: 'From ₹299',
    },
    {
      title: 'Electrical',
      subtitle: 'Switches, wiring & repairs',
      icon: 'flashOutline',
      colorClass: 'amber',
      priceText: 'From ₹299',
    },
  ];

  scrollPopular(direction: -1 | 1): void {
    const scroller = this.popularScroller?.nativeElement;
    if (!scroller) {
      return;
    }

    const step = Math.max(scroller.clientWidth * 0.82, 220);
    scroller.scrollBy({ left: direction * step, behavior: 'smooth' });
  }

  onPopularScroll(): void {
    const scroller = this.popularScroller?.nativeElement;
    if (!scroller) {
      return;
    }

    const firstCard = scroller.querySelector<HTMLElement>('.popular-card');
    const cardStep = (firstCard?.offsetWidth ?? 220) + 12;
    const approximateIndex = Math.round(scroller.scrollLeft / cardStep);
    const maxIndex = Math.max(this.popularServices.length - 1, 0);
    this.activePopularIndex = Math.max(0, Math.min(approximateIndex, maxIndex));
  }

  openPopularService(service: PopularService): void {
    this.openBookingPage(service.title, service.priceText);
  }

  openServiceCard(service: ServiceItem): void {
    this.openBookingPage(service.title, service.priceText);
  }

  private openBookingPage(serviceName: string, priceText: string): void {
    this.router.navigate(['/home/booking'], {
      queryParams: {
        service: serviceName,
        price: this.extractPrice(priceText),
      },
    });
  }

  private extractPrice(priceText: string): number {
    const numericPrice = Number(priceText.replace(/[^\d]/g, ''));
    return Number.isFinite(numericPrice) && numericPrice > 0 ? numericPrice : 299;
  }
}
