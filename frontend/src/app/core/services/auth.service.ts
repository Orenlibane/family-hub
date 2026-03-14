import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { SocketService } from './socket.service';
import { User, Household, AuthState, Role } from '../models';

interface AuthResponse {
  user: User;
  household: Household;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly _state$ = new BehaviorSubject<AuthState>({
    user: null,
    household: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly user$ = this._state$.pipe(map(s => s.user));
  readonly household$ = this._state$.pipe(map(s => s.household));
  readonly isAuthenticated$ = this._state$.pipe(map(s => s.isAuthenticated));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly role$ = this._state$.pipe(map(s => s.user?.role ?? null));

  readonly isAdmin$ = this.role$.pipe(map(role => role === 'ADMIN'));
  readonly isAdult$ = this.role$.pipe(map(role => role === 'ADMIN' || role === 'ADULT'));
  readonly isKid$ = this.role$.pipe(map(role => role === 'KID'));

  constructor(
    private api: ApiService,
    private socket: SocketService,
    private router: Router
  ) {
    // Check auth status on init
    this.checkAuth();
  }

  /**
   * Check current authentication status
   */
  checkAuth(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<AuthResponse>('/auth/me').pipe(
      tap(response => {
        this.updateState({
          user: response.user,
          household: response.household,
          isAuthenticated: true,
          isLoading: false
        });

        // Connect to socket with token
        this.socket.connect(response.token);
        this.socket.joinHousehold(response.household.id);
      }),
      catchError(error => {
        this.updateState({
          user: null,
          household: null,
          isAuthenticated: false,
          isLoading: false
        });
        return of(null);
      })
    ).subscribe();
  }

  /**
   * Initiate Google OAuth login
   */
  loginWithGoogle(): void {
    window.location.href = `${this.api['baseUrl']}/auth/google`;
  }

  /**
   * Handle OAuth callback (called after redirect)
   */
  handleOAuthCallback(code: string): Observable<AuthResponse> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<AuthResponse>('/auth/google/callback', { code }).pipe(
      tap(response => {
        this.updateState({
          user: response.user,
          household: response.household,
          isAuthenticated: true,
          isLoading: false
        });

        this.socket.connect(response.token);
        this.socket.joinHousehold(response.household.id);

        // Navigate based on role
        this.navigateByRole(response.user.role);
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Login failed'
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Login with username and PIN (for kids)
   */
  loginWithPin(username: string, pin: string): Observable<AuthResponse> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<AuthResponse>('/auth/child/login', { username, pin }).pipe(
      tap(response => {
        this.updateState({
          user: response.user,
          household: response.household,
          isAuthenticated: true,
          isLoading: false
        });

        this.socket.connect(response.token);
        this.socket.joinHousehold(response.household.id);

        // Navigate based on role
        this.navigateByRole(response.user.role);
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.error?.message || 'Invalid credentials'
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Logout
   */
  logout(): void {
    this.api.post('/auth/logout', {}).subscribe({
      next: () => {
        this.socket.disconnect();
        this.updateState({
          user: null,
          household: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        this.router.navigate(['/login']);
      },
      error: () => {
        // Force logout even on error
        this.socket.disconnect();
        this.updateState({
          user: null,
          household: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Update user's FamCoins (from socket events)
   */
  updateCoins(newBalance: number): void {
    const current = this._state$.value;
    if (current.user) {
      this.updateState({
        user: { ...current.user, famCoins: newBalance }
      });
    }
  }

  /**
   * Update user profile (name and avatar)
   */
  updateProfile(name: string, avatar?: string): void {
    const current = this._state$.value;
    if (current.user) {
      const updatedUser = {
        ...current.user,
        name,
        avatar: avatar || current.user.avatar
      };

      this.updateState({
        user: updatedUser
      });

      // Save to localStorage for persistence
      localStorage.setItem('user_profile', JSON.stringify({
        name: updatedUser.name,
        avatar: updatedUser.avatar
      }));

      // TODO: Call API to persist to backend
      // this.api.patch('/users/me', { name, avatar }).subscribe();
    }
  }

  /**
   * Navigate based on user role
   */
  private navigateByRole(role: Role): void {
    if (role === 'KID') {
      this.router.navigate(['/playground']);
    } else {
      this.router.navigate(['/command-center']);
    }
  }

  /**
   * Get current snapshot of state
   */
  getSnapshot(): AuthState {
    return this._state$.value;
  }

  /**
   * Check if user has role
   */
  hasRole(role: Role): boolean {
    return this._state$.value.user?.role === role;
  }

  /**
   * Check if user is admin or adult
   */
  isAdultOrAdmin(): boolean {
    const role = this._state$.value.user?.role;
    return role === 'ADMIN' || role === 'ADULT';
  }

  private updateState(partial: Partial<AuthState>): void {
    this._state$.next({
      ...this._state$.value,
      ...partial
    });
  }
}
