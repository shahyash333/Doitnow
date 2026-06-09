import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { Capacitor } from '@capacitor/core';

import { AuthService } from '../services/auth.service';

/**
 * Shows the marketing landing page only for unauthenticated web visitors at `/`.
 * Native Android/iOS and logged-in users never match this route.
 */
export const webGuestLandingMatchGuard: CanMatchFn = (): boolean | UrlTree => {
  if (Capacitor.getPlatform() !== 'web') {
    return false;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};
