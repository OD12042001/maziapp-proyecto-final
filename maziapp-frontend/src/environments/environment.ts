/**
 * Entorno de DESARROLLO LOCAL.
 *
 * Los GUID de Azure/Entra ID son placeholders válidos en formato pero
 * ficticios: todavía no tenemos los valores reales del tenant. Mientras
 * `useMockAuth` sea true, la aplicación NO intenta autenticar contra
 * Microsoft: usa el usuario y los roles de `mockAuth`.
 *
 * Para volver a la autenticación real:
 *   1. Reemplazar clientId / tenantId / scopes por los valores reales.
 *   2. Poner useMockAuth en false.
 *   3. En el backend, quitar AUTH_DEV_BYPASS de local.settings.json.
 */
export const environment = {
  production: false,

  /** 🔐 Bypass de MSAL para desarrollo local (ver core/auth/mock-auth.ts). */
  useMockAuth: true,

  api: {
    baseUrl: 'http://localhost:7071/api',
  },

  azure: {
    // Placeholders con formato de GUID válido. NO son credenciales reales.
    clientId: '00000000-0000-0000-0000-000000000001',
    tenantId: '00000000-0000-0000-0000-000000000002',
    redirectUri: 'http://localhost:4200',

    scopes: {
      api: 'api://00000000-0000-0000-0000-000000000003/access_as_user',
      graph: 'User.Read',
    },
  },

  /**
   * Usuario sintético de desarrollo. Debe coincidir con DEV_USER_OID y
   * DEV_USER_ROLES de maziapp-backend/local.settings.json: el backend
   * usa ese oid para resolver la cartera del usuario autenticado.
   */
  mockAuth: {
    oid: '11111111-1111-1111-1111-111111111111',
    name: 'Usuario Desarrollo',
    email: 'dev@maziflow.local',
    roles: [
      'ejecutivo_inversion',
      'compliance',
      'administracion',
      'direccion_comercial',
      'gerencia_general',
    ],
  },
};
