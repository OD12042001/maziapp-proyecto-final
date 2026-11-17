import { getPool, sql } from "../../config/sql";

/**
 * Repositorio de idempotencia de comandos HTTP
 * (`dbo.IdempotenciaSolicitudes`).
 *
 * Flujo de una clave:
 *   iniciar → (EN_PROCESO) → completar → (COMPLETADA, respuesta guardada)
 *                         ↘ liberar   (la operación falló: se borra la
 *                                      reserva para que el cliente reintente)
 *
 * `UQ_IdempotenciaSolicitudes_Clave` es la barrera real contra dos
 * solicitudes simultáneas con la misma clave: solo una inserta.
 */

export interface SolicitudIdempotente {
  clave: string;
  endpoint: string;
  usuarioId: string | null;
  hashSolicitud: string;
}

export interface RegistroIdempotencia {
  clave: string;
  endpoint: string;
  usuarioId: string | null;
  hashSolicitud: string;
  estado: "EN_PROCESO" | "COMPLETADA";
  codigoRespuesta: number | null;
  cuerpoRespuesta: string | null;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function esViolacionDeUnicidad(error: any): boolean {
  const numero = error?.number ?? error?.originalError?.info?.number;

  return numero === 2627 || numero === 2601;
}

/**
 * Reserva la clave. `true` si esta solicitud es la primera y debe
 * ejecutar la operación; `false` si la clave ya existía.
 */
export async function reservar(
  solicitud: SolicitudIdempotente,
): Promise<boolean> {
  const pool = await getPool();

  try {
    const result = await pool
      .request()
      .input("clave", sql.NVarChar(100), solicitud.clave)
      .input("endpoint", sql.NVarChar(200), solicitud.endpoint)
      .input(
        "usuarioId",
        sql.UniqueIdentifier,
        solicitud.usuarioId && GUID.test(solicitud.usuarioId)
          ? solicitud.usuarioId
          : null,
      )
      .input("hash", sql.Char(64), solicitud.hashSolicitud)
      .query(`
        INSERT INTO dbo.IdempotenciaSolicitudes
          (Clave, Endpoint, UsuarioId, HashSolicitud, Estado, CreadoFechaUtc)
        SELECT @clave, @endpoint, @usuarioId, @hash, N'EN_PROCESO', SYSUTCDATETIME()
        WHERE NOT EXISTS (
          SELECT 1 FROM dbo.IdempotenciaSolicitudes WHERE Clave = @clave
        )
      `);

    return Number(result.rowsAffected?.[0] ?? 0) === 1;
  } catch (error) {
    if (esViolacionDeUnicidad(error)) {
      return false;
    }

    throw error;
  }
}

export async function findByClave(
  clave: string,
): Promise<RegistroIdempotencia | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("clave", sql.NVarChar(100), clave)
    .query(`
      SELECT Clave, Endpoint, UsuarioId, HashSolicitud, Estado, CodigoRespuesta, CuerpoRespuesta
      FROM dbo.IdempotenciaSolicitudes
      WHERE Clave = @clave
    `);

  const row = result.recordset[0];

  if (!row) return null;

  return {
    clave: row.Clave,
    endpoint: row.Endpoint,
    usuarioId: row.UsuarioId ? String(row.UsuarioId).toLowerCase() : null,
    hashSolicitud: String(row.HashSolicitud).trim(),
    estado: row.Estado,
    codigoRespuesta: row.CodigoRespuesta ?? null,
    cuerpoRespuesta: row.CuerpoRespuesta ?? null,
  };
}

/** Guarda la respuesta definitiva. Solo transiciona desde `EN_PROCESO`. */
export async function completar(
  clave: string,
  codigoRespuesta: number,
  cuerpoRespuesta: string,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("clave", sql.NVarChar(100), clave)
    .input("codigo", sql.Int, codigoRespuesta)
    .input("cuerpo", sql.NVarChar(sql.MAX), cuerpoRespuesta)
    .query(`
      UPDATE dbo.IdempotenciaSolicitudes
      SET Estado = N'COMPLETADA',
          CodigoRespuesta = @codigo,
          CuerpoRespuesta = @cuerpo,
          CompletadoFechaUtc = SYSUTCDATETIME()
      WHERE Clave = @clave AND Estado = N'EN_PROCESO'
    `);

  return Number(result.rowsAffected?.[0] ?? 0) === 1;
}

/**
 * Libera una reserva que NO llegó a completarse. Nunca toca una clave
 * `COMPLETADA`: una respuesta guardada es definitiva.
 */
export async function liberar(clave: string): Promise<void> {
  const pool = await getPool();

  await pool
    .request()
    .input("clave", sql.NVarChar(100), clave)
    .query(`
      DELETE FROM dbo.IdempotenciaSolicitudes
      WHERE Clave = @clave AND Estado = N'EN_PROCESO'
    `);
}
