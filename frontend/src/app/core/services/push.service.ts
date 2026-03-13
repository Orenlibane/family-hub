import { Injectable } from '@angular/core';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

export interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | null;
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PushService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  private readonly _state$ = new BehaviorSubject<PushState>({
    isSupported: false,
    isSubscribed: false,
    permission: null,
    isLoading: false,
    error: null
  });

  readonly state$ = this._state$.asObservable();
  readonly isSubscribed$ = this._state$.pipe(map(s => s.isSubscribed));
  readonly isSupported$ = this._state$.pipe(map(s => s.isSupported));

  constructor(private api: ApiService) {
    this.checkSupport();
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): void {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = 'Notification' in window ? Notification.permission : null;

    this.updateState({
      isSupported,
      permission
    });

    if (isSupported) {
      this.registerServiceWorker();
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/ngsw-worker.js');
      console.log('[Push] Service worker registered');

      // Check if already subscribed
      const subscription = await this.swRegistration.pushManager.getSubscription();
      this.updateState({ isSubscribed: !!subscription });
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error);
      this.updateState({ error: 'Failed to register service worker' });
    }
  }

  /**
   * Request notification permission and subscribe
   */
  subscribe(): Observable<boolean> {
    if (!this._state$.value.isSupported) {
      return of(false);
    }

    this.updateState({ isLoading: true, error: null });

    return from(this.requestPermission()).pipe(
      switchMap(permission => {
        if (permission !== 'granted') {
          this.updateState({
            isLoading: false,
            permission,
            error: 'Notification permission denied'
          });
          return of(false);
        }

        return from(this.createSubscription()).pipe(
          switchMap(subscription => {
            if (!subscription) {
              throw new Error('Failed to create subscription');
            }

            // Send subscription to backend
            return this.api.post<{ success: boolean }>('/api/push/subscribe', subscription).pipe(
              map(() => {
                this.updateState({
                  isSubscribed: true,
                  isLoading: false,
                  permission: 'granted'
                });
                return true;
              })
            );
          })
        );
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to subscribe'
        });
        return of(false);
      })
    );
  }

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe(): Observable<boolean> {
    if (!this.swRegistration) {
      return of(false);
    }

    this.updateState({ isLoading: true, error: null });

    return from(this.swRegistration.pushManager.getSubscription()).pipe(
      switchMap(subscription => {
        if (!subscription) {
          this.updateState({ isSubscribed: false, isLoading: false });
          return of(true);
        }

        return from(subscription.unsubscribe()).pipe(
          switchMap(() => {
            return this.api.post<{ success: boolean }>('/api/push/unsubscribe', {
              endpoint: subscription.endpoint
            }).pipe(
              map(() => {
                this.updateState({ isSubscribed: false, isLoading: false });
                return true;
              })
            );
          })
        );
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to unsubscribe'
        });
        return of(false);
      })
    );
  }

  /**
   * Request notification permission
   */
  private async requestPermission(): Promise<NotificationPermission> {
    return await Notification.requestPermission();
  }

  /**
   * Create push subscription
   */
  private async createSubscription(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null;

    try {
      const applicationServerKey = this.urlBase64ToUint8Array(environment.vapidPublicKey);
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });
      return subscription;
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      return null;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Send test notification (for debugging)
   */
  sendTestNotification(): Observable<{ success: boolean }> {
    return this.api.post('/api/push/test', {});
  }

  private updateState(partial: Partial<PushState>): void {
    this._state$.next({
      ...this._state$.value,
      ...partial
    });
  }
}
