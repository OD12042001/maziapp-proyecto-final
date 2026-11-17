export const ENV = {
  azure: {
    tenantId: process.env.AZURE_TENANT_ID!,
    frontClientId: process.env.FRONT_CLIENT_ID!,
    apiClientId: process.env.API_CLIENT_ID!,
    issuer: `https://sts.windows.net/${process.env.AZURE_TENANT_ID}/`,
    jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`,
    scope: "access_as_user",
  },
  sql: {
    server: process.env.SQL_SERVER!,
    /**
     * Puerto opcional. Sin la variable se omite y `mssql` usa 1433, que es
     * el comportamiento histórico contra Azure SQL. El contenedor local
     * publica 14333 para no chocar con una instancia nativa.
     */
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined,
    database: process.env.SQL_DATABASE!,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    encrypt: (process.env.SQL_ENCRYPT ?? "true") === "true",
    /**
     * Solo para SQL Server local con certificado autofirmado. Por defecto
     * false, que es lo correcto contra Azure SQL.
     */
    trustServerCertificate: process.env.SQL_TRUST_CERT === "true",
    poolMax: Number(process.env.SQL_POOL_MAX ?? 5),
    poolMin: Number(process.env.SQL_POOL_MIN ?? 0),
  },
  isLocal: process.env.NODE_ENV !== "production",
  /**
   * 🔐 Bypass de autenticación SOLO para desarrollo local.
   *
   * Se activa únicamente cuando se cumplen las TRES condiciones:
   *   1. AUTH_DEV_BYPASS === "true"        (explícito en local.settings.json)
   *   2. NODE_ENV !== "production"
   *   3. No existe WEBSITE_INSTANCE_ID     (Azure Functions SIEMPRE la define
   *      en un Function App desplegado; si está presente, se ignora el flag)
   *
   * Si cualquiera falla, el bypass queda desactivado y se exige JWT normal.
   * Nunca se habilita por defecto ni en producción.
   */
  auth: {
    devBypass:
      process.env.AUTH_DEV_BYPASS === "true" &&
      process.env.NODE_ENV !== "production" &&
      !process.env.WEBSITE_INSTANCE_ID,
    devUser: {
      oid:
        process.env.DEV_USER_OID ?? "11111111-1111-1111-1111-111111111111",
      name: process.env.DEV_USER_NAME ?? "Usuario Desarrollo",
      preferred_username:
        process.env.DEV_USER_EMAIL ?? "dev@maziflow.local",
      roles: (process.env.DEV_USER_ROLES ?? "ejecutivo_inversion")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    },
  },
};
