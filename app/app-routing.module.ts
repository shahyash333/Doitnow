import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, authMatchGuard, guestOnlyMatchGuard } from './core/guards/auth.guard';
import { webGuestLandingMatchGuard } from './core/guards/web-landing.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [webGuestLandingMatchGuard],
    loadComponent: () =>
      import('./features/web-landing/web-landing.page').then(
        (component) => component.WebLandingPage,
      ),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canMatch: [guestOnlyMatchGuard],
    loadChildren: () =>
      import('./features/auth/login/login.module').then((module) => module.LoginPageModule),
  },
  {
    path: 'home',
    canMatch: [authMatchGuard],
    canActivate: [authGuard],
    loadChildren: () =>
      import('./layout/tabs/tabs.module').then((module) => module.TabsPageModule),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
