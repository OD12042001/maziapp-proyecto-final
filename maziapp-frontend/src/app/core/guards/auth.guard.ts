import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { environment } from '../../../environments/environment';

/**
 * Guard de autenticación.
 *
 * - Desarrollo local (`useMockAuth: true`): deja pasar sin pasar por MSAL.
 *   La identidad sintética la resuelve AuthService (core/auth/auth.service.ts).
 * - Cualquier otro caso: delega en MsalGuard, exactamente como antes.
 *
 * Reemplaza a MsalGuard en app.routes.ts. La autorización por rol sigue
 * viviendo en roleGuard, que no se modifica.
 */
export const authGuard: CanActivateFn = (route, state) => {
  if (environment.useMockAuth) {
    return true;
  }

  return inject(MsalGuard).canActivate(route, state);
};
