import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session';


export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const session = inject(SessionService);
  const router = inject(Router);
  const token = session.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
        
      }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        session.clearSession();
        router.navigate(['/login']);
      } else if (error.status === 403 && router.url.startsWith('/voluntarios')) {
        router.navigate(['/expedientes']);
      }

      return throwError(() => error);
    })
  );
};

