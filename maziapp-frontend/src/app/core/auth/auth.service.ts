import { loginRequest } from './msal.config';
import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { MOCK_ACCOUNT, MOCK_ROLES } from './mock-auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private msal: MsalService) {}

  private restoreAccount() {
    // 🔐 Modo desarrollo local: identidad sintética, sin MSAL.
    if (environment.useMockAuth) {
      return MOCK_ACCOUNT;
    }

    let account = this.msal.instance.getActiveAccount();

    if (!account) {
      const accounts = this.msal.instance.getAllAccounts();

      if (accounts.length > 0) {
        account = accounts[0];
        this.msal.instance.setActiveAccount(account);
      }
    }

    return account;
  }

  login() {
    if (environment.useMockAuth) {
      // No hay proveedor de identidad: la sesión mock ya está "activa".
      return;
    }

    this.msal.loginRedirect(loginRequest);
  }

  logout() {
    if (environment.useMockAuth) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }

      return;
    }

    this.msal.logoutRedirect();
  }

  getUser() {
    return this.restoreAccount();
  }

  isLoggedIn(): boolean {
    return this.restoreAccount() !== null;
  }

  async getRoles(): Promise<string[]> {
    if (environment.useMockAuth) {
      return MOCK_ROLES;
    }

    try {
      const account = this.restoreAccount();

      if (!account) return [];

      const response = await this.msal.instance.acquireTokenSilent({
        scopes: [environment.azure.scopes.api],
        account,
      });

      const decoded: any = jwtDecode(response.accessToken);

      return decoded.roles || [];
    } catch {
      return [];
    }
  }

  async getUserPhoto(): Promise<string | null> {
    // Sin Graph en local: la UI muestra las iniciales.
    if (environment.useMockAuth) {
      return null;
    }

    try {
      const account = this.restoreAccount();

      if (!account) return null;

      const response = await this.msal.instance.acquireTokenSilent({
        scopes: [environment.azure.scopes.graph],
        account,
      });

      const res = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      if (!res.ok) return null;

      const blob = await res.blob();

      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }
}
