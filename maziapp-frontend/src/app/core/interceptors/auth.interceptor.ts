import { HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';

import { MsalService } from '@azure/msal-angular';

import { InteractionRequiredAuthError } from '@azure/msal-browser';

import { from, throwError } from 'rxjs';

import { switchMap, catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // 🔥 SOLO INTERCEPTAR API
  if (!req.url.startsWith(environment.api.baseUrl)) {
    return next(req);
  }

  const msal = inject(MsalService);

  let account = msal.instance.getActiveAccount();

  // 🔥 restaurar sesión
  if (!account) {
    const accounts = msal.instance.getAllAccounts();

    if (accounts.length > 0) {
      account = accounts[0];

      msal.instance.setActiveAccount(account);
    }
  }

  // 🔥 sin usuario
  if (!account) {
    return next(req);
  }

  const tokenRequest = {
    scopes: [environment.azure.scopes.api],

    account,
  };

  // 🔧 Fase 3.4, punto 8 — CORRECCIÓN JUSTIFICADA POR CÓDIGO:
  // antes, `catchError` envolvía TODA la cadena, incluyendo
  // `switchMap(... next(clonedRequest) ...)`. Como `next()` es quien
  // ejecuta la llamada HTTP real al Backend, cualquier respuesta de
  // error del servidor (400 de validación, 403 sin rol, 409 duplicado,
  // 500 interno) también caía dentro de este mismo `catchError` y se
  // registraba como "Auth interceptor error", aunque no tuviera nada
  // que ver con autenticación.
  //
  // La corrección: `catchError` ahora se adjunta ÚNICAMENTE al
  // observable de `acquireTokenSilent(...)`, ANTES del `switchMap`.
  // Así:
  //   - un fallo real de MSAL (p. ej. requiere interacción del
  //     usuario) sigue disparando `loginRedirect` y logueándose aquí
  //     como error de autenticación, exactamente igual que antes;
  //   - un error de la respuesta HTTP real (400/401/403/409/500) ya
  //     NO pasa por este `catchError` — se propaga tal cual al
  //     `subscribe({ error })` de quien hizo la llamada (hoy,
  //     `contacto-modal.component.ts`, sin cambios), donde corresponde
  //     manejarlo según su propio código de estado.
  // No se modificó ninguna lógica de adquisición/validación de token.
  return from(msal.instance.acquireTokenSilent(tokenRequest)).pipe(
    catchError((err) => {
      if (err instanceof InteractionRequiredAuthError) {
        // 🔥 token expirado o requiere login
        msal.loginRedirect({
          scopes: [environment.azure.scopes.api],
        });
      } else {
        console.error('Auth interceptor error (adquisición de token):', err);
      }

      return throwError(() => err);
    }),

    switchMap((response) => {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      return next(clonedRequest);
    }),
  );
};
