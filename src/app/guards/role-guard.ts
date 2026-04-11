import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { SessionService } from '../services/session';

export const roleGuard = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const session = inject(SessionService);
  const allowedRoles = (route.data?.['roles'] as string[] | undefined) ?? [];

  if (!allowedRoles.length || session.hasAnyRole(allowedRoles)) {
    return true;
  }

  router.navigate(['/expedientes']);
  return false;
};
