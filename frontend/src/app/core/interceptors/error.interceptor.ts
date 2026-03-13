import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Global error interceptor
 * Handles common HTTP errors and transforms them for the app
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        switch (error.status) {
          case 0:
            errorMessage = 'Unable to connect to server. Please check your connection.';
            break;

          case 400:
            errorMessage = error.error?.message || 'Invalid request';
            break;

          case 401:
            // Unauthorized - redirect to login
            errorMessage = 'Session expired. Please log in again.';
            router.navigate(['/login']);
            break;

          case 403:
            errorMessage = 'You do not have permission to perform this action';
            break;

          case 404:
            errorMessage = error.error?.message || 'Resource not found';
            break;

          case 409:
            errorMessage = error.error?.message || 'Conflict with existing data';
            break;

          case 422:
            // Validation error
            errorMessage = error.error?.message || 'Validation failed';
            break;

          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;

          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;

          case 503:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;

          default:
            errorMessage = error.error?.message || `Error: ${error.status}`;
        }
      }

      // Log error in development
      if (!environment.production) {
        console.error('[HTTP Error]', {
          url: req.url,
          status: error.status,
          message: errorMessage,
          error: error.error
        });
      }

      // Return a normalized error
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        original: error
      }));
    })
  );
};

// Import environment for production check
import { environment } from '../../../environments/environment';
