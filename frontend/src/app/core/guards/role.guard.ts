import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Role } from '../models';

/**
 * Role-based access control guard
 * Use with route data: { roles: ['ADMIN', 'ADULT'] }
 */
export const roleGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as Role[] | undefined;

  return authService.state$.pipe(
    map(state => {
      if (state.isLoading) {
        return true;
      }

      if (!state.isAuthenticated || !state.user) {
        return router.createUrlTree(['/login']);
      }

      // If no roles specified, allow access
      if (!allowedRoles || allowedRoles.length === 0) {
        return true;
      }

      // Check if user has required role
      if (allowedRoles.includes(state.user.role)) {
        return true;
      }

      // Redirect based on user's actual role
      if (state.user.role === 'KID') {
        return router.createUrlTree(['/playground']);
      }
      return router.createUrlTree(['/command-center']);
    }),
    take(1)
  );
};

/**
 * Admin-only guard
 */
export const adminGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map(state => {
      if (state.isLoading) {
        return true;
      }

      if (!state.isAuthenticated || !state.user) {
        return router.createUrlTree(['/login']);
      }

      if (state.user.role === 'ADMIN') {
        return true;
      }

      // Non-admins go to their dashboard
      if (state.user.role === 'KID') {
        return router.createUrlTree(['/playground']);
      }
      return router.createUrlTree(['/command-center']);
    }),
    take(1)
  );
};

/**
 * Adults only (ADMIN or ADULT) guard
 */
export const adultGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map(state => {
      if (state.isLoading) {
        return true;
      }

      if (!state.isAuthenticated || !state.user) {
        return router.createUrlTree(['/login']);
      }

      if (state.user.role === 'ADMIN' || state.user.role === 'ADULT') {
        return true;
      }

      // Kids go to playground
      return router.createUrlTree(['/playground']);
    }),
    take(1)
  );
};

/**
 * Kids only guard
 */
export const kidGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.state$.pipe(
    map(state => {
      if (state.isLoading) {
        return true;
      }

      if (!state.isAuthenticated || !state.user) {
        return router.createUrlTree(['/login']);
      }

      if (state.user.role === 'KID') {
        return true;
      }

      // Adults go to command center
      return router.createUrlTree(['/command-center']);
    }),
    take(1)
  );
};
