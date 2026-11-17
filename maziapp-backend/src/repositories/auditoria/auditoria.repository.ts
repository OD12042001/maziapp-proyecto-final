import { getPool, sql } from "../../config/sql";
import {
  ContextoSolicitud,
  contextoActual,
} from "../../utils/requestContext";

/**
 * Repositorio de auditoría (S40) sobre `dbo.AuditoriaEventos`.
 *
 * La bitácora es de SOLO ANEXADO: este módulo expone `INSERT` y lecturas,
 * y nada más. El motor lo refuerza con `TR_AuditoriaEventos_SoloAnexado`,
 * que rechaza `UPDATE` y `DELETE` incluso al propietario de la base.
 *
 * Las marcas de tiempo son UTC (`SYSUTCDATETIME()`); el servidor de
 * aplicaciones nunca aporta la hora del evento.
 */

/**
 * Cualquier cosa que sepa abrir un `Request`: el pool o una transacción
 * en curso. Permite que un cambio de negocio y su evento de auditoría
 * se confirmen o se reviertan JUNTOS.
 */
export interface Ejecutor {
  request(): sql.Request;
}

export type ResultadoAuditoria = "EXITO" | "RECHAZO" | "ERROR";

export interface NuevoEventoAuditoria {
  servicioCodigo: string;
  operacion: string;
  entidad?: string | null;
  entidadId?: string | number | null;
  resultado: ResultadoAuditoria;
  valorAnterior?: unknown;
  valorNuevo?: unknown;
  detalle?: unknown;
}

export interface EventoAuditoria {
  eventoId: string;
  fechaEventoUtc: string;
  correlationId: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  rolCodigo: string | null;
  servicioCodigo: string;
  operacion: string;
  entidad: string | null;
  entidadId: string | null;
  resultado: ResultadoAuditoria;
  valorAnterior: unknown;
  valorNuevo: unknown;
  detalle: unknown;
  direccionIp: string | null;
  userAgent: string | null;
}

export interface FiltrosAuditoria {
  servicioCodigo?: string;
  entidad?: string;
  entidadId?: string;
  correlationId?: string;
  usuarioId?: string;
  resultado?: ResultadoAuditoria;
  desde?: Date;
  hasta?: Date;
  page: number;
  pageSize: number;
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El `oid` de un token es un GUID, pero la columna `uniqueidentifier`
 * lanzaría una excepción ante cualquier otro valor y un fallo de
 * auditoría no debe tumbar la operación: si no es GUID, se omite.
 */
function guidOrNull(value: string | undefined | null): string | null {
  return value && GUID.test(value) ? value : null;
}

function truncar(value: string | null | undefined, largo: number) {
  if (value === null || value === undefined) return null;
  return value.length > largo ? value.slice(0, largo) : value;
}

function aJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  return JSON.stringify(value);
}

function aObjeto(value: unknown): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toIso(value: Date | string | null): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toEvento(row: any): EventoAuditoria {
  return {
    eventoId: String(row.EventoId),
    fechaEventoUtc: toIso(row.FechaEventoUtc),
    correlationId: row.CorrelationId ?? null,
    usuarioId: row.UsuarioId ? String(row.UsuarioId).toLowerCase() : null,
    usuarioNombre: row.UsuarioNombre ?? null,
    rolCodigo: row.RolCodigo ?? null,
    servicioCodigo: row.ServicioCodigo,
    operacion: row.Operacion,
    entidad: row.Entidad ?? null,
    entidadId: row.EntidadId ?? null,
    resultado: row.Resultado,
    valorAnterior: aObjeto(row.ValorAnterior),
    valorNuevo: aObjeto(row.ValorNuevo),
    detalle: aObjeto(row.Detalle),
    direccionIp: row.DireccionIp ?? null,
    userAgent: row.UserAgent ?? null,
  };
}

/**
 * Anexa un evento. Toma correlación, usuario, IP y user-agent del
 * contexto de la solicitud (`withCors`/`withAuth`) salvo que se pase uno
 * explícito. Pasar el `Ejecutor` de la transacción de negocio hace que
 * el evento exista si y solo si el cambio se confirmó.
 */
export async function registrarEvento(
  ejecutor: Ejecutor,
  evento: NuevoEventoAuditoria,
  contexto: ContextoSolicitud | undefined = contextoActual(),
): Promise<void> {
  const usuario = contexto?.usuario;

  await ejecutor
    .request()
    .input("correlationId", sql.NVarChar(64), contexto?.correlationId ?? null)
    .input("usuarioId", sql.UniqueIdentifier, guidOrNull(usuario?.oid))
    .input("usuarioNombre", sql.NVarChar(200), truncar(usuario?.name, 200))
    .input(
      "rolCodigo",
      sql.NVarChar(50),
      truncar(usuario?.roles?.[0]?.toLowerCase(), 50),
    )
    .input("servicioCodigo", sql.NVarChar(10), evento.servicioCodigo)
    .input("operacion", sql.NVarChar(80), evento.operacion)
    .input("entidad", sql.NVarChar(80), evento.entidad ?? null)
    .input(
      "entidadId",
      sql.NVarChar(64),
      evento.entidadId === undefined || evento.entidadId === null
        ? null
        : String(evento.entidadId),
    )
    .input("resultado", sql.NVarChar(20), evento.resultado)
    .input("valorAnterior", sql.NVarChar(sql.MAX), aJson(evento.valorAnterior))
    .input("valorNuevo", sql.NVarChar(sql.MAX), aJson(evento.valorNuevo))
    .input("detalle", sql.NVarChar(sql.MAX), aJson(evento.detalle))
    .input("direccionIp", sql.NVarChar(45), contexto?.direccionIp ?? null)
    .input("userAgent", sql.NVarChar(300), contexto?.userAgent ?? null)
    .query(`
      INSERT INTO dbo.AuditoriaEventos
        (FechaEventoUtc, CorrelationId, UsuarioId, UsuarioNombre, RolCodigo,
         ServicioCodigo, Operacion, Entidad, EntidadId, Resultado,
         ValorAnterior, ValorNuevo, Detalle, DireccionIp, UserAgent)
      VALUES
        (SYSUTCDATETIME(), @correlationId, @usuarioId, @usuarioNombre, @rolCodigo,
         @servicioCodigo, @operacion, @entidad, @entidadId, @resultado,
         @valorAnterior, @valorNuevo, @detalle, @direccionIp, @userAgent)
    `);
}

export async function findEventos(
  filtros: FiltrosAuditoria,
): Promise<{ items: EventoAuditoria[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.servicioCodigo) {
    request.input("servicioCodigo", sql.NVarChar(10), filtros.servicioCodigo);
    condiciones.push("ServicioCodigo = @servicioCodigo");
  }

  if (filtros.entidad) {
    request.input("entidad", sql.NVarChar(80), filtros.entidad);
    condiciones.push("Entidad = @entidad");
  }

  if (filtros.entidadId) {
    request.input("entidadId", sql.NVarChar(64), filtros.entidadId);
    condiciones.push("EntidadId = @entidadId");
  }

  if (filtros.correlationId) {
    request.input("correlationId", sql.NVarChar(64), filtros.correlationId);
    condiciones.push("CorrelationId = @correlationId");
  }

  if (filtros.usuarioId) {
    request.input("usuarioId", sql.UniqueIdentifier, filtros.usuarioId);
    condiciones.push("UsuarioId = @usuarioId");
  }

  if (filtros.resultado) {
    request.input("resultado", sql.NVarChar(20), filtros.resultado);
    condiciones.push("Resultado = @resultado");
  }

  if (filtros.desde) {
    request.input("desde", sql.DateTime2, filtros.desde);
    condiciones.push("FechaEventoUtc >= @desde");
  }

  if (filtros.hasta) {
    request.input("hasta", sql.DateTime2, filtros.hasta);
    condiciones.push("FechaEventoUtc <= @hasta");
  }

  const whereSql =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(
    `SELECT COUNT(*) AS Total FROM dbo.AuditoriaEventos ${whereSql}`,
  );

  const total = Number(countResult.recordset[0]?.Total ?? 0);

  request.input("offset", sql.Int, (filtros.page - 1) * filtros.pageSize);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    SELECT EventoId, FechaEventoUtc, CorrelationId, UsuarioId, UsuarioNombre,
           RolCodigo, ServicioCodigo, Operacion, Entidad, EntidadId, Resultado,
           ValorAnterior, ValorNuevo, Detalle, DireccionIp, UserAgent
    FROM dbo.AuditoriaEventos
    ${whereSql}
    ORDER BY EventoId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return { items: pageResult.recordset.map(toEvento), total };
}

export async function findEventoById(
  eventoId: string,
): Promise<EventoAuditoria | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("eventoId", sql.BigInt, eventoId)
    .query(`
      SELECT EventoId, FechaEventoUtc, CorrelationId, UsuarioId, UsuarioNombre,
             RolCodigo, ServicioCodigo, Operacion, Entidad, EntidadId, Resultado,
             ValorAnterior, ValorNuevo, Detalle, DireccionIp, UserAgent
      FROM dbo.AuditoriaEventos
      WHERE EventoId = @eventoId
    `);

  const row = result.recordset[0];

  return row ? toEvento(row) : null;
}
