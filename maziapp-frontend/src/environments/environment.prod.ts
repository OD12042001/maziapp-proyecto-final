/**
 * Entorno de PRODUCCIÓN.
 *
 * Existe para que `ng build` (configuración production, ver angular.json
 * fileReplacements) compile. Los valores de Azure son placeholders: hay
 * que reemplazarlos antes de cualquier despliegue real.
 *
 * 🔐 `useMockAuth` queda en FALSE a propósito: un bypass de autenticación
 * no debe viajar en un artefacto de producción. Para una demo local usar
 * `ng serve` (environment.ts) o `ng build --configuration development`.
 */
export const environment = {
  production: true,

  useMockAuth: false,

  api: {
    // TODO: reemplazar por la URL real del Function App.
    baseUrl: 'https://TU-FUNCTION-APP.azurewebsites.net/api',
  },

  azure: {
    // TODO: reemplazar por los GUID reales del tenant de Entra ID.
    clientId: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    redirectUri: 'https://TU-FRONTEND.azurestaticapps.net',

    scopes: {
      api: 'api://00000000-0000-0000-0000-000000000003/access_as_user',
      graph: 'User.Read',
    },
  },

  mockAuth: {
    oid: '11111111-1111-1111-1111-111111111111',
    name: 'Usuario Desarrollo',
    email: 'dev@maziflow.local',
    roles: [] as string[],
  },
};
