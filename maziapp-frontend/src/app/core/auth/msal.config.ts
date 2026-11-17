import { PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';

// 🔐 MEJORA DE SEGURIDAD (auditoría #4 - ALTO):
// El proyecto original usaba `cacheLocation: 'localStorage'`, lo que
// amplía la superficie de exposición ante un XSS (cualquier script
// inyectado puede leer el token). `sessionStorage` reduce esa ventana:
// el token deja de estar disponible al cerrar la pestaña y no se
// comparte entre pestañas. Contrapartida documentada en
// docs/SECURITY.md: el usuario deberá volver a iniciar sesión si abre
// la app en una pestaña nueva.
export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: environment.azure.clientId,

    authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,

    redirectUri: environment.azure.redirectUri,

    postLogoutRedirectUri: environment.azure.redirectUri,
  },

  cache: {
    cacheLocation: 'sessionStorage',
  },
});

// 🔐 LOGIN
export const loginRequest = {
  scopes: [environment.azure.scopes.api, 'User.Read'],
};
