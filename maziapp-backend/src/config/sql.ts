import sql, { ConnectionPool, config as SqlConfig } from "mssql";

import { ENV } from "./env";

/**
 * Pool de conexión a Azure SQL Database (Serverless).
 *
 * Notas de diseño (ver docs/DATABASE.md):
 * - `min: 0` permite que el pool se vacíe cuando no hay tráfico, algo
 *   deseable con un tier Serverless que puede pausarse automáticamente.
 * - El primer request tras una pausa de la base puede tardar varios
 *   segundos en "despertar" (cold start); por eso `connectionTimeout` y
 *   `requestTimeout` son más generosos que en un SQL Provisioned normal.
 * - El pool se crea una sola vez por instancia de Function (reutilizado
 *   entre invocaciones "warm"), en línea con las recomendaciones de Azure
 *   Functions para conexiones a bases de datos.
 */
const sqlConfig: SqlConfig = {
  server: ENV.sql.server,
  port: ENV.sql.port,
  database: ENV.sql.database,
  user: ENV.sql.user,
  password: ENV.sql.password,
  options: {
    encrypt: ENV.sql.encrypt, // requerido por Azure SQL
    trustServerCertificate: ENV.sql.trustServerCertificate,
  },
  pool: {
    max: ENV.sql.poolMax,
    min: ENV.sql.poolMin,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000, // margen para el "resume" de un SQL Serverless en pausa
  requestTimeout: 30000,
};

let poolPromise: Promise<ConnectionPool> | null = null;

/**
 * Devuelve un pool de conexión ya conectado, reutilizándolo entre
 * invocaciones de la misma instancia de Function App.
 */
export function getPool(): Promise<ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(sqlConfig).connect().catch((err) => {
      // 🔁 si falla, se limpia la promesa para reintentar en la próxima invocación
      poolPromise = null;
      throw err;
    });
  }

  // `poolPromise` está garantizado no-nulo aquí: si `.connect()` falla, el
  // `.catch()` relanza el error (nunca resuelve a null) — TypeScript no
  // puede seguir ese análisis a través del closure asíncrono, de ahí el `!`.
  return poolPromise!;
}

export { sql };
