import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { environment } from '../../../environments/environment';

const DEBUG = true;

export interface AuthUser {
  addresses: AuthAddress[];
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthAddress {
  id: string;
  userId?: string | null;
  label: string;
  fullAddress: string;
  isDefault?: boolean;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  accessTokenExpiresIn?: string;
  refreshTokenExpiresIn?: string;
  user: AuthUser;
}

interface GoogleCredentialResponse {
  credential?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly accessTokenStorageKey = 'accessToken';
  private readonly refreshTokenStorageKey = 'refreshToken';
  private readonly userStorageKey = 'user';
  private readonly loggedInSubject = new BehaviorSubject<boolean>(this.hasStoredToken());
  private readonly userSubject = new BehaviorSubject<AuthUser | null>(this.getStoredUser());
  private refreshInFlight: Promise<string> | null = null;

  readonly isLoggedIn$ = this.loggedInSubject.asObservable();
  readonly user$ = this.userSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {}

  async signInWithGoogle(): Promise<void> {
    const platform = Capacitor.getPlatform();

    if (DEBUG) {
      console.log('[AuthService] Platform detected:', platform);
      console.log('[AuthService] Google login started');
    }

    try {
      if (platform === 'android') {
        await this.handleAndroidLogin();
        return;
      }

      await this.handleWebLogin();
    } catch (error) {
      console.error('Google sign-in flow failed', error);
      throw error;
    }
  }

  async handleWebLogin(): Promise<void> {
    const googleIdentity = (window as any).google?.accounts?.id;

    if (!googleIdentity) {
      throw new Error('Google Identity Services script is not loaded');
    }

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const complete = (fn: () => void): void => {
        if (settled) {
          return;
        }

        settled = true;
        fn();
      };

      googleIdentity.initialize({
        client_id: environment.google.webClientId,
        callback: async (response: GoogleCredentialResponse) => {
          const idToken = response?.credential;

          if (!idToken) {
            complete(() => reject(new Error('Google web login did not return a credential')));
            return;
          }

          if (DEBUG) {
            console.log('[AuthService] Google token received (web), token length:', idToken.length);
          }

          try {
            await this.handleBackendLogin(idToken);
            complete(resolve);
          } catch (error) {
            complete(() => reject(error));
          }
        },
      });

      googleIdentity.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
          const reason =
            notification?.getNotDisplayedReason?.() ??
            notification?.getSkippedReason?.() ??
            'unknown reason';
          complete(() => reject(new Error(`Google web login was not completed: ${reason}`)));
        }
      });
    });
  }

  async handleAndroidLogin(): Promise<void> {
    let user: any;

    try {
      user = await GoogleAuth.signIn();
    } catch (error) {
      const typedError = error as { message?: string; error?: unknown; code?: string | number };
      console.error('Google Android Sign-In Error:', error);
      console.error('Google Android Sign-In Error message:', typedError?.message);
      console.error('Google Android Sign-In Error error:', typedError?.error);
      console.error('Google Android Sign-In Error code:', typedError?.code);
      throw error;
    }

    const idToken = user.authentication?.idToken;

    if (!idToken) {
      throw new Error('Google Android login did not return an idToken');
    }

    if (DEBUG) {
      console.log('[AuthService] Google token received (android), token length:', idToken.length);
    }

    await this.handleBackendLogin(idToken);
  }

  async handleBackendLogin(token: string): Promise<void> {
    const apiUrl = `${environment.apiUrl}/auth/google`;

    if (DEBUG) {
      console.log('[AuthService] Backend login call triggered');
      console.log('[AuthService] API URL:', apiUrl);
      console.log('[AuthService] Token length:', token.length);
    }

    try {
      const response: HttpResponse<AuthResponse> = await firstValueFrom(
        this.http.post<AuthResponse>(apiUrl, { token }, { observe: 'response' }),
      );

      if (DEBUG) {
        console.log('[AuthService] Backend response received');
        console.log('[AuthService] Backend response status:', response.status);
      }

      const responseBody = response.body;

      if (!responseBody?.accessToken) {
        throw new Error('Backend login response does not include accessToken');
      }

      if (!responseBody?.refreshToken) {
        throw new Error('Backend login response does not include refreshToken');
      }

      this.persistSession(responseBody);
      await this.router.navigate(['/home']);
    } catch (error) {
      if (DEBUG && error instanceof HttpErrorResponse) {
        console.error('[AuthService] Backend response status:', error.status);
      }
      console.error('Backend login failed', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = this.getRefreshToken();
      const apiUrl = `${environment.apiUrl}/auth/logout`;
      const body = refreshToken ? { refreshToken } : {};

      await firstValueFrom(this.http.post<void>(apiUrl, body));
    } catch (error) {
      console.error('Backend logout failed', error);
    } finally {
      this.clearSession();
      await this.router.navigate(['/login'], { replaceUrl: true });
    }

    try {
      if (Capacitor.getPlatform() === 'android') {
        await GoogleAuth.signOut();
      } else {
        const googleIdentity = (window as any).google?.accounts?.id;
        googleIdentity?.disableAutoSelect?.();
      }
    } catch (error) {
      console.error('Google logout failed', error);
    }
  }

  async logoutAll(): Promise<void> {
    try {
      const apiUrl = `${environment.apiUrl}/auth/logout-all`;
      await firstValueFrom(this.http.post<void>(apiUrl, {}));
    } catch (error) {
      console.error('Backend logout-all failed', error);
    } finally {
      this.clearSession();
      await this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  async refreshAccessToken(): Promise<string> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.executeRefresh().finally(() => {
      this.refreshInFlight = null;
    });

    return this.refreshInFlight;
  }

  restoreSession(): void {
    this.loggedInSubject.next(this.hasStoredToken());
    this.userSubject.next(this.getStoredUser());
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessTokenStorageKey);
  }

  getToken(): string | null {
    return this.getAccessToken();
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenStorageKey);
  }

  getCurrentUser(): AuthUser | null {
    return this.userSubject.value;
  }

  isLoggedIn(): boolean {
    return this.loggedInSubject.value;
  }

  forceSignOut(): void {
    this.clearSession();
    void this.router.navigate(['/login'], { replaceUrl: true });
  }

  updateLocalPhone(phone: string | null): void {
    const currentUser = this.getCurrentUser();

    if (!currentUser) {
      return;
    }

    const normalizedPhone = phone?.trim() ? phone.trim() : null;
    const updatedUser: AuthUser = {
      ...currentUser,
      phone: normalizedPhone,
      updatedAt: currentUser.updatedAt,
    };

    this.userSubject.next(updatedUser);
    localStorage.setItem(this.userStorageKey, JSON.stringify(updatedUser));
  }

  private async executeRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.forceSignOut();
      throw new Error('No refresh token available');
    }

    try {
      const responseBody = await firstValueFrom(
        this.http.post<AuthResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }),
      );

      if (!responseBody?.accessToken || !responseBody?.refreshToken) {
        throw new Error('Refresh response does not include accessToken and refreshToken');
      }

      this.persistSession(responseBody);
      return responseBody.accessToken;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.forceSignOut();
      }
      throw error;
    }
  }

  private hasStoredToken(): boolean {
    return Boolean(localStorage.getItem(this.accessTokenStorageKey));
  }

  private persistSession(payload: Pick<AuthResponse, 'accessToken' | 'refreshToken' | 'user'>): void {
    const normalizedUser = this.normalizeUser(payload.user);
    localStorage.setItem(this.accessTokenStorageKey, payload.accessToken);
    localStorage.setItem(this.refreshTokenStorageKey, payload.refreshToken);
    localStorage.setItem(this.userStorageKey, JSON.stringify(normalizedUser));
    this.loggedInSubject.next(true);
    this.userSubject.next(normalizedUser);
  }

  private getStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(this.userStorageKey);

    if (!rawUser) {
      return null;
    }

    try {
      return this.normalizeUser(JSON.parse(rawUser));
    } catch {
      localStorage.removeItem(this.userStorageKey);
      return null;
    }
  }

  private normalizeUser(user: unknown): AuthUser | null {
    if (!user || typeof user !== 'object') {
      return null;
    }

    const source = user as Record<string, unknown>;
    const nowIso = new Date().toISOString();
    const id = this.readString(source, ['id', 'userId', 'uid']) ?? 'unknown-user';

    return {
      addresses: this.normalizeAddresses(source['addresses']),
      id,
      email: this.readString(source, ['email']),
      phone: this.readString(source, ['phone', 'phoneNumber', 'mobile']),
      fullName: this.readString(source, ['fullName', 'name', 'displayName']),
      avatarUrl: this.readString(source, [
        'avatarUrl',
        'avatar_url',
        'avatar',
        'photoUrl',
        'photo_url',
        'picture',
        'profileImage',
        'profileImageUrl',
      ]),
      role: this.readString(source, ['role']) ?? 'user',
      isActive: this.readBoolean(source, ['isActive', 'active']) ?? true,
      createdAt: this.readString(source, ['createdAt', 'created_at']) ?? nowIso,
      updatedAt: this.readString(source, ['updatedAt', 'updated_at']) ?? nowIso,
    };
  }

  private normalizeAddresses(input: unknown): AuthAddress[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map((entry) => this.normalizeAddress(entry))
      .filter((address): address is AuthAddress => address !== null);
  }

  private normalizeAddress(entry: unknown): AuthAddress | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const source = entry as Record<string, unknown>;
    const id = this.readString(source, ['id']);
    const label = this.readString(source, ['label']) ?? 'Address';
    const fullAddress = this.readString(source, ['fullAddress', 'address']) ?? '';

    if (!id || !fullAddress) {
      return null;
    }

    return {
      id,
      userId: this.readString(source, ['userId', 'user_id']),
      label,
      fullAddress,
      isDefault: this.readBoolean(source, ['isDefault', 'default']) ?? false,
    };
  }

  private readString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
    return null;
  }

  private readBoolean(source: Record<string, unknown>, keys: string[]): boolean | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'boolean') {
        return value;
      }
    }
    return null;
  }

  private clearSession(): void {
    localStorage.removeItem(this.accessTokenStorageKey);
    localStorage.removeItem(this.refreshTokenStorageKey);
    localStorage.removeItem(this.userStorageKey);
    this.loggedInSubject.next(false);
    this.userSubject.next(null);
  }
}
