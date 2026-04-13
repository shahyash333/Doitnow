import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';

const toLoginUrlTree = (router: Router): UrlTree =>
  router.createUrlTree(['/login']);

const toHomeUrlTree = (router: Router): UrlTree =>
  router.createUrlTree(['/home']);

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() ? true : toLoginUrlTree(router);
};

export const authMatchGuard: CanMatchFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() ? true : toLoginUrlTree(router);
};

export const guestOnlyMatchGuard: CanMatchFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isLoggedIn() ? toHomeUrlTree(router) : true;
};
