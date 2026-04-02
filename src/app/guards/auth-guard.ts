
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../services/session';


export const authGuard = () => {

  const router = inject(Router);
  const session = inject(SessionService);

  const token = session.getToken();

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // 🔥 validar expiración
  if (session.isTokenExpired()) {
    session.clearSession();
    router.navigate(['/login']);
    return false;
  }

  return true;
};

