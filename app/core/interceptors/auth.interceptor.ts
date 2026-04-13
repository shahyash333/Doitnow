import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { switchMap } from 'rxjs/operators';

import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();
    const authRequest = this.attachHeaders(request, token, true);

    return this.handleWithNgrokFallback(authRequest, next).pipe(
      catchError((error: unknown) => {
        const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;

        if (!isUnauthorized || this.shouldSkipRefresh(request)) {
          return throwError(() => error);
        }

        return from(this.authService.refreshAccessToken()).pipe(
          switchMap((newAccessToken) => {
            const retryRequest = this.attachHeaders(request, newAccessToken, true);
            return this.handleWithNgrokFallback(retryRequest, next);
          }),
          catchError((refreshError: unknown) => throwError(() => refreshError)),
        );
      }),
    );
  }

  private handleWithNgrokFallback(
    request: HttpRequest<unknown>,
    next: HttpHandler,
  ): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: unknown) => {
        const shouldRetryWithoutNgrokHeader =
          error instanceof HttpErrorResponse && error.status === 0 && request.url.includes('ngrok-free.app');

        if (!shouldRetryWithoutNgrokHeader) {
          return throwError(() => error);
        }

        const fallbackRequest = request.clone({
          setHeaders: this.buildHeaders(this.authService.getAccessToken(), false),
        });
        console.warn('[AuthInterceptor] Retrying request without ngrok header:', request.url);
        return next.handle(fallbackRequest);
      }),
    );
  }

  private attachHeaders(
    request: HttpRequest<unknown>,
    token: string | null,
    includeNgrokHeader: boolean,
  ): HttpRequest<unknown> {
    return request.clone({ setHeaders: this.buildHeaders(token, includeNgrokHeader) });
  }

  private shouldSkipRefresh(request: HttpRequest<unknown>): boolean {
    return request.url.includes('/auth/google') || request.url.includes('/auth/refresh');
  }

  private buildHeaders(token: string | null, includeNgrokHeader: boolean): Record<string, string> {
    const setHeaders: Record<string, string> = {};

    if (includeNgrokHeader) {
      setHeaders['ngrok-skip-browser-warning'] = '1';
    }

    if (token) {
      setHeaders['Authorization'] = `Bearer ${token}`;
    }

    return setHeaders;
  }
}
