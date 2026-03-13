import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Prevents unauthenticated users from accessing protected routes
 * Redirects to /login if not authenticated
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    // Wait for initial auth check to complete
    map(state => {
      if (state.isLoading) {
        // Still loading, allow navigation (will be checked again)
        return true;
      }

      if (state.isAuthenticated) {
        return true;
      }

      // Not authenticated, redirect to login
      return router.createUrlTree(['/login']);
    }),
    take(1)
  );
};

/**
 * Prevents authenticated users from accessing auth pages (login, register)
 * Redirects to appropriate dashboard based on role
 */
export const noAuthGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map(state => {
      if (state.isLoading) {
        return true;
      }

      if (!state.isAuthenticated) {
        return true;
      }

      // Already authenticated, redirect based on role
      if (state.user?.role === 'KID') {
        return router.createUrlTree(['/playground']);
      }
      return router.createUrlTree(['/command-center']);
    }),
    take(1)
  );
};
