import { AccountInfo } from '@azure/msal-browser';

import { environment } from '../../../environments/environment';

/**
 * Cuenta sintética para desarrollo local, con la misma forma que
 * `AccountInfo` de MSAL. Permite que SessionService, TopbarComponent y
 * los guards funcionen sin un tenant real de Entra ID.
 *
 * Solo se usa cuando `environment.useMockAuth` es true (ver
 * core/auth/auth.service.ts). El backend valida la contraparte con
 * AUTH_DEV_BYPASS y DEV_USER_OID.
 */
export const MOCK_ACCOUNT: AccountInfo = {
  homeAccountId: `mock.${environment.mockAuth.oid}`,
  environment: 'mock',
  tenantId: environment.azure.tenantId,
  username: environment.mockAuth.email,
  localAccountId: environment.mockAuth.oid,
  name: environment.mockAuth.name,
  idTokenClaims: {
    oid: environment.mockAuth.oid,
    name: environment.mockAuth.name,
    preferred_username: environment.mockAuth.email,
    email: environment.mockAuth.email,
    roles: environment.mockAuth.roles,
  },
};

export const MOCK_ROLES: string[] = environment.mockAuth.roles;
