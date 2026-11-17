import { getPool, sql } from "../../config/sql";
import { contextoActual } from "../../utils/requestContext";
import { Ejecutor } from "../auditoria/auditoria.repository";

/**
 * Repositorio del outbox transaccional del ESB lógico (`dbo.OutboxEventos`
 * y `dbo.OutboxConsumidos`).
 *
 * Garantías que sostiene este módulo:
 *  - PUBLICAR es transaccional: `publicarEvento` recibe el `Ejecutor` de
 *    la transacción de negocio, así que el evento existe si y solo si el
 *    cambio se confirmó (patrón outbox).
 *  - PUBLICAR es idempotente: `UQ_OutboxEventos_IdempotencyKey` impide dos
 *    eventos con la misma clave, y la inserción condicional evita el
 *    error de unicidad en el caso normal.
 *  - RECLAMAR es seguro con varios despachadores: `UPDLOCK, READPAST`
 *    hace que dos despachadores concurrentes nunca tomen el mismo mensaje.
 *  - Un despachador caído no deja mensajes huérfanos: al reclamar se
 *    fija `ProximoIntentoUtc` como ARRENDAMIENTO (lease); si vence con el
 *    mensaje aún `EN_PROCESO`, otro despachador lo recupera.
 */

export type EstadoOutbox =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "PUBLICADO"
  | "FALLIDO"
  | "MUERTO";

export type TipoEventoOutbox =
  | "EtapaCambiada"
  | "KycEstadoCambiado"
  | "CierreGanadoRegistrado"
  | "ComisionCalculada"
  | "ComisionRevertida"
  | "LiquidacionGenerada";

export interface NuevoEventoOutbox {
  tipoEvento: TipoEventoOutbox;
  agregado: string;
  agregadoId: string | number;
  payload: Record<string, unknown>;
  /**
   * Clave determinista del hecho de negocio (p. ej.
   * `EtapaCambiada:{oportunidadId}:{etapaDestinoId}`). Dos publicaciones
   * del mismo hecho producen UN solo mensaje.
   */
  idempotencyKey: string;
  correlationId?: string | null;
}

export interface EventoOutbox {
  outboxId: string;
  tipoEvento: string;
  agregado: string;
  agregadoId: string;
  payload: unknown;
  correlationId: string | null;
  idempotencyKey: string;
  estado: EstadoOutbox;
  intentos: number;
  proximoIntentoUtc: string;
  ultimoError: string | null;
  creadoFechaUtc: string;
  procesadoFechaUtc: string | null;
}

/** Segundos que un mensaje `EN_PROCESO` permanece reservado. */
export const LEASE_SEGUNDOS = 300;

const COLUMNAS = `
  OutboxId, TipoEvento, Agregado, AgregadoId, Payload, CorrelationId,
  IdempotencyKey, Estado, Intentos, ProximoIntentoUtc, UltimoError,
  CreadoFechaUtc, ProcesadoFechaUtc
`;

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function aObjeto(value: unknown): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toEvento(row: any): EventoOutbox {
  return {
    outboxId: String(row.OutboxId),
    tipoEvento: row.TipoEvento,
    agregado: row.Agregado,
    agregadoId: row.AgregadoId,
    payload: aObjeto(row.Payload),
    correlationId: row.CorrelationId ?? null,
    idempotencyKey: row.IdempotencyKey,
    estado: row.Estado,
    intentos: Number(row.Intentos ?? 0),
    proximoIntentoUtc: toIso(row.ProximoIntentoUtc) as string,
    ultimoError: row.UltimoError ?? null,
    creadoFechaUtc: toIso(row.CreadoFechaUtc) as string,
    procesadoFechaUtc: toIso(row.ProcesadoFechaUtc),
  };
}

function filasAfectadas(result: { rowsAffected?: number[] }): number {
  return Number(result.rowsAffected?.[0] ?? 0);
}

function esViolacionDeUnicidad(error: any): boolean {
  const numero = error?.number ?? error?.originalError?.info?.number;

  return numero === 2627 || numero === 2601;
}

// ---------------------------------------------------------------------
// Publicación (dentro de la transacción de negocio)
// ---------------------------------------------------------------------

/**
 * Anexa un evento al outbox. Devuelve `true` si lo insertó y `false` si
 * ya existía uno con la misma `idempotencyKey`. La correlación sale del
 * contexto de la solicitud salvo que se informe explícita.
 */
export async function publicarEvento(
  ejecutor: Ejecutor,
  evento: NuevoEventoOutbox,
): Promise<boolean> {
  const correlationId =
    evento.correlationId ?? contextoActual()?.correlationId ?? null;

  const result = await ejecutor
    .request()
    .input("tipoEvento", sql.NVarChar(80), evento.tipoEvento)
    .input("agregado", sql.NVarChar(80), evento.agregado)
    .input("agregadoId", sql.NVarChar(64), String(evento.agregadoId))
    .input("payload", sql.NVarChar(sql.MAX), JSON.stringify(evento.payload))
    .input("correlationId", sql.NVarChar(64), correlationId)
    .input("idempotencyKey", sql.NVarChar(100), evento.idempotencyKey)
    .query(`
      INSERT INTO dbo.OutboxEventos
        (TipoEvento, Agregado, AgregadoId, Payload, CorrelationId,
         IdempotencyKey, Estado, Intentos, ProximoIntentoUtc, CreadoFechaUtc)
      SELECT
        @tipoEvento, @agregado, @agregadoId, @payload, @correlationId,
        @idempotencyKey, N'PENDIENTE', 0, SYSUTCDATETIME(), SYSUTCDATETIME()
      WHERE NOT EXISTS (
        SELECT 1 FROM dbo.OutboxEventos WHERE IdempotencyKey = @idempotencyKey
      )
    `);

  return filasAfectadas(result) === 1;
}

// ---------------------------------------------------------------------
// Despacho
// ---------------------------------------------------------------------

/**
 * Reserva hasta `limite` mensajes listos para despachar: `PENDIENTE` o
 * `FALLIDO` con `ProximoIntentoUtc` vencido, y también `EN_PROCESO` cuyo
 * arrendamiento ya venció (despachador caído). Incrementa `Intentos` al
 * reservar, de modo que un despachador que muere a mitad de camino igual
 * consume un intento y el mensaje no puede reintentarse sin fin.
 */
export async function reclamarLote(limite: number): Promise<EventoOutbox[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("limite", sql.Int, limite)
    .input("lease", sql.Int, LEASE_SEGUNDOS)
    .query(`
      ;WITH lote AS (
        SELECT TOP (@limite) *
        FROM dbo.OutboxEventos WITH (ROWLOCK, UPDLOCK, READPAST)
        WHERE Estado IN (N'PENDIENTE', N'FALLIDO', N'EN_PROCESO')
          AND ProximoIntentoUtc <= SYSUTCDATETIME()
        ORDER BY OutboxId
      )
      UPDATE lote
      SET Estado = N'EN_PROCESO',
          Intentos = Intentos + 1,
          ProximoIntentoUtc = DATEADD(SECOND, @lease, SYSUTCDATETIME())
      OUTPUT inserted.OutboxId, inserted.TipoEvento, inserted.Agregado,
             inserted.AgregadoId, inserted.Payload, inserted.CorrelationId,
             inserted.IdempotencyKey, inserted.Estado, inserted.Intentos,
             inserted.ProximoIntentoUtc, inserted.UltimoError,
             inserted.CreadoFechaUtc, inserted.ProcesadoFechaUtc
    `);

  return result.recordset
    .map(toEvento)
    .sort((a, b) => Number(a.outboxId) - Number(b.outboxId));
}

/**
 * Cierra el mensaje como `PUBLICADO`. Condicionado a `EN_PROCESO`: si el
 * arrendamiento venció y otro despachador lo recuperó, este cierre no
 * pisa su estado.
 */
export async function marcarPublicado(outboxId: string): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("outboxId", sql.BigInt, outboxId)
    .query(`
      UPDATE dbo.OutboxEventos
      SET Estado = N'PUBLICADO',
          ProcesadoFechaUtc = SYSUTCDATETIME(),
          UltimoError = NULL
      WHERE OutboxId = @outboxId AND Estado = N'EN_PROCESO'
    `);

  return filasAfectadas(result) === 1;
}

/**
 * Registra un fallo de entrega. Con `proximoIntentoUtc` el mensaje queda
 * `FALLIDO` y se reintentará; con `null` pasa a `MUERTO` (cola de
 * fallidos) y ya no se despacha solo.
 */
export async function marcarFallo(
  outboxId: string,
  error: string,
  proximoIntentoUtc: Date | null,
): Promise<boolean> {
  const pool = await getPool();
  const muerto = proximoIntentoUtc === null;

  const request = pool
    .request()
    .input("outboxId", sql.BigInt, outboxId)
    .input("estado", sql.NVarChar(20), muerto ? "MUERTO" : "FALLIDO")
    .input("error", sql.NVarChar(2000), error.slice(0, 2000));

  if (!muerto) {
    request.input("proximo", sql.DateTime2, proximoIntentoUtc);
  }

  const result = await request.query(`
    UPDATE dbo.OutboxEventos
    SET Estado = @estado,
        UltimoError = @error,
        ProximoIntentoUtc = ${muerto ? "ProximoIntentoUtc" : "@proximo"}
    WHERE OutboxId = @outboxId AND Estado = N'EN_PROCESO'
  `);

  return filasAfectadas(result) === 1;
}

/**
 * Inserta la marca de consumo (`OutboxId`, `Consumidor`) con el
 * `Ejecutor` de la transacción del consumidor. Devuelve `false` si ya
 * existía: ese consumidor ya produjo su efecto para este evento y NO debe
 * repetirlo (entrega al-menos-una-vez + efecto exactamente-una-vez).
 */
export async function registrarConsumo(
  ejecutor: Ejecutor,
  outboxId: string,
  consumidor: string,
): Promise<boolean> {
  try {
    const result = await ejecutor
      .request()
      .input("outboxId", sql.BigInt, outboxId)
      .input("consumidor", sql.NVarChar(80), consumidor)
      .query(`
        INSERT INTO dbo.OutboxConsumidos (OutboxId, Consumidor, Resultado, ProcesadoFechaUtc)
        SELECT @outboxId, @consumidor, N'PROCESADO', SYSUTCDATETIME()
        WHERE NOT EXISTS (
          SELECT 1 FROM dbo.OutboxConsumidos
          WHERE OutboxId = @outboxId AND Consumidor = @consumidor
        )
      `);

    return filasAfectadas(result) === 1;
  } catch (error) {
    // Carrera entre dos despachadores sobre el mismo par: gana uno.
    if (esViolacionDeUnicidad(error)) {
      return false;
    }

    throw error;
  }
}

// ---------------------------------------------------------------------
// Consulta
// ---------------------------------------------------------------------

export interface FiltrosOutbox {
  estado?: EstadoOutbox;
  tipoEvento?: string;
  page: number;
  pageSize: number;
}

export async function findOutbox(
  filtros: FiltrosOutbox,
): Promise<{ items: EventoOutbox[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.estado) {
    request.input("estado", sql.NVarChar(20), filtros.estado);
    condiciones.push("Estado = @estado");
  }

  if (filtros.tipoEvento) {
    request.input("tipoEvento", sql.NVarChar(80), filtros.tipoEvento);
    condiciones.push("TipoEvento = @tipoEvento");
  }

  const whereSql =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(
    `SELECT COUNT(*) AS Total FROM dbo.OutboxEventos ${whereSql}`,
  );

  const total = Number(countResult.recordset[0]?.Total ?? 0);

  request.input("offset", sql.Int, (filtros.page - 1) * filtros.pageSize);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    SELECT ${COLUMNAS}
    FROM dbo.OutboxEventos
    ${whereSql}
    ORDER BY OutboxId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return { items: pageResult.recordset.map(toEvento), total };
}

export async function findOutboxById(
  outboxId: string,
): Promise<EventoOutbox | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("outboxId", sql.BigInt, outboxId)
    .query(`SELECT ${COLUMNAS} FROM dbo.OutboxEventos WHERE OutboxId = @outboxId`);

  const row = result.recordset[0];

  return row ? toEvento(row) : null;
}
