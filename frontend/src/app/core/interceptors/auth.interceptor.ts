import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Auth interceptor - adds credentials for cookie-based auth
 * Uses HttpOnly cookies so no token manipulation needed
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Only add credentials for our API
  if (req.url.startsWith(environment.apiUrl)) {
    const authReq = req.clone({
      withCredentials: true
    });
    return next(authReq);
  }

  return next(req);
};
