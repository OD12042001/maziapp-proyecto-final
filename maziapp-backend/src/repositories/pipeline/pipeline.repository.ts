import { getPool, sql } from "../../config/sql";
import { registrarEvento } from "../auditoria/auditoria.repository";
import { publicarEvento } from "../esb/outbox.repository";

/**
 * Acceso a datos del módulo Pipeline (S06).
 *
 * Lecturas: `vw_OportunidadResumen`, que ya resuelve el contacto, la
 * etapa actual, el último expediente KYC y el cierre/comisión vigentes.
 * Escrituras: tablas base, siempre con parámetros `.input(...)` — el
 * único texto interpolado son nombres de columna fijos del código.
 *
 * Las operaciones que tocan `Oportunidades` y
 * `OportunidadEtapaHistorial` a la vez corren en transacción: el hito
 * del embudo no puede quedar sin su cambio de etapa, ni al revés.
 */

export interface Etapa {
  etapaId: number;
  codigo: string;
  nombre: string;
  orden: number;
  permiteCierre: boolean;
  esFinal: boolean;
  activo: boolean;
}

export interface Oportunidad {
  oportunidadId: number;
  contactoId: number;
  contactoNombre: string | null;
  responsableId: string;
  estado: string;
  montoEstimado: number | null;
  monedaCodigo: string | null;
  etapa: Etapa;
  fechaCreacionUtc: string | null;
  fechaIngresoEtapaUtc: string | null;
  fechaResultadoUtc: string | null;
  motivoPerdida: string | null;
  kycEstado: string | null;
  cierreId: number | null;
  comisionId: number | null;
}

export interface HistorialEtapa {
  historialId: number;
  etapaOrigen: Etapa | null;
  etapaDestino: Etapa;
  fechaCambioUtc: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  motivo: string | null;
  observacion: string | null;
  correlationId: string | null;
}

export interface FiltrosOportunidad {
  estado?: string;
  etapaCodigo?: string;
  contactoId?: number;
  responsableId?: string;
  page: number;
  pageSize: number;
}

export interface NuevaOportunidad {
  contactoId: number;
  responsableId: string;
  etapaId: number;
  montoEstimado: number | null;
  monedaCodigo: string | null;
  creadoId: string;
  creadoNombre: string;
}

export interface CambioEtapa {
  usuarioId: string;
  usuarioNombre: string;
  observacion: string | null;
  correlationId: string | null;
  estado: string;
  fechaResultado: Date | null;
}

/**
 * Un cambio de estado/etapa se evaluó sobre una lectura previa que otra
 * sesión invalidó: el `UPDATE` condicional no afectó ninguna fila. El
 * servicio lo traduce a 409. Es el estándar de concurrencia aprobado
 * (`UPDATE` condicional + `rowsAffected = 1`), el mismo de KYC.
 */
export class PipelineConflictoConcurrenciaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineConflictoConcurrenciaError";
  }
}

function filasAfectadas(result: { rowsAffected?: number[] }): number {
  return Number(result.rowsAffected?.[0] ?? 0);
}

// ---------------------------------------------------------------------
// Mapeo de filas a dominio
// ---------------------------------------------------------------------

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toId(value: unknown): number | null {
  const n = toNumber(value);
  return n === null ? null : Math.trunc(n);
}

function toEtapa(row: any, p: string): Etapa {
  return {
    etapaId: row[`${p}Id`],
    codigo: row[`${p}Codigo`],
    nombre: row[`${p}Nombre`],
    orden: toNumber(row[`${p}Orden`]) ?? 0,
    permiteCierre: !!row[`${p}PermiteCierre`],
    esFinal: !!row[`${p}EsFinal`],
    activo: !!row[`${p}Activo`],
  };
}

function toOportunidad(row: any): Oportunidad {
  return {
    oportunidadId: row.OportunidadId,
    contactoId: row.ContactoId,
    contactoNombre: row.NombreCompleto ?? null,
    responsableId: row.ResponsableId,
    estado: row.Estado,
    montoEstimado: toNumber(row.MontoEstimado),
    monedaCodigo: row.MonedaCodigo ?? null,
    etapa: {
      etapaId: row.EtapaId,
      codigo: row.EtapaCodigo,
      nombre: row.EtapaNombre,
      orden: toNumber(row.EtapaOrden) ?? 0,
      permiteCierre: !!row.EtapaPermiteCierre,
      esFinal: !!row.EtapaEsFinal,
      activo: !!row.EtapaActivo,
    },
    fechaCreacionUtc: toIso(row.FechaCreacionUtc),
    fechaIngresoEtapaUtc: toIso(row.FechaIngresoEtapaUtc),
    fechaResultadoUtc: toIso(row.FechaResultadoUtc),
    motivoPerdida: row.MotivoPerdida ?? null,
    kycEstado: row.KycEstado ?? null,
    cierreId: toId(row.CierreId),
    comisionId: toId(row.ComisionId),
  };
}

const SELECT_VIEW = `SELECT * FROM dbo.vw_OportunidadResumen`;

/**
 * Valida y mapea la fila releída DENTRO de la transacción: si la lectura
 * posterior a la escritura no devuelve nada, se aborta antes del commit
 * (nunca después, donde el rollback ya no tendría efecto).
 */
function exigirOportunidad(row: any): Oportunidad {
  if (!row) {
    throw new Error("La oportunidad no pudo releerse después de la escritura");
  }

  return toOportunidad(row);
}

/**
 * Anexa a la bitácora y al outbox, DENTRO de la transacción de negocio,
 * el hecho "la oportunidad entró en esta etapa". La clave de idempotencia
 * es (oportunidad, etapa destino): el embudo es secuencial, así que una
 * oportunidad entra a cada etapa a lo sumo una vez.
 */
async function publicarEtapaCambiada(
  transaction: { request(): sql.Request },
  oportunidad: Oportunidad,
  etapaOrigenId: number | null,
  correlationId: string | null,
): Promise<void> {
  await publicarEvento(transaction, {
    tipoEvento: "EtapaCambiada",
    agregado: "Oportunidad",
    agregadoId: oportunidad.oportunidadId,
    idempotencyKey: `EtapaCambiada:${oportunidad.oportunidadId}:${oportunidad.etapa.etapaId}`,
    correlationId,
    payload: {
      oportunidadId: oportunidad.oportunidadId,
      contactoId: oportunidad.contactoId,
      responsableId: oportunidad.responsableId,
      etapaOrigenId,
      etapaDestinoId: oportunidad.etapa.etapaId,
      etapaDestinoCodigo: oportunidad.etapa.codigo,
      permiteCierre: oportunidad.etapa.permiteCierre,
      estado: oportunidad.estado,
    },
  });
}

// ---------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------

export async function findAllEtapas(): Promise<Etapa[]> {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT EtapaId, Codigo AS EtapaCodigo, Nombre AS EtapaNombre, Orden AS EtapaOrden,
           PermiteCierre AS EtapaPermiteCierre, EsFinal AS EtapaEsFinal, Activo AS EtapaActivo
    FROM dbo.PipelineEtapas
    ORDER BY Orden ASC
  `);

  return result.recordset.map((row: any) => toEtapa(row, "Etapa"));
}

/**
 * Solo las etapas utilizables. El avance secuencial y la etapa inicial
 * se calculan sobre esta lista: una etapa desactivada en el catálogo
 * deja de ser destino válido sin tocar código.
 */
export async function findEtapasActivas(): Promise<Etapa[]> {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT EtapaId, Codigo AS EtapaCodigo, Nombre AS EtapaNombre, Orden AS EtapaOrden,
           PermiteCierre AS EtapaPermiteCierre, EsFinal AS EtapaEsFinal, Activo AS EtapaActivo
    FROM dbo.PipelineEtapas
    WHERE Activo = 1
    ORDER BY Orden ASC
  `);

  return result.recordset.map((row: any) => toEtapa(row, "Etapa"));
}

export async function findMonedaActiva(codigo: string) {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("codigo", sql.Char(3), codigo)
    .query(`
      SELECT MonedaCodigo, Nombre, Simbolo
      FROM dbo.Monedas
      WHERE MonedaCodigo = @codigo AND Activo = 1
    `);

  const row = result.recordset[0];

  return row
    ? { monedaCodigo: row.MonedaCodigo, nombre: row.Nombre, simbolo: row.Simbolo }
    : null;
}

// ---------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------

export async function findOportunidadById(
  oportunidadId: number,
): Promise<Oportunidad | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`${SELECT_VIEW} WHERE OportunidadId = @oportunidadId`);

  const row = result.recordset[0];

  return row ? toOportunidad(row) : null;
}

/**
 * Listado paginado. El `WHERE` se arma solo con los filtros presentes,
 * pero cada valor viaja como parámetro: el texto de la query nunca
 * contiene datos del usuario.
 */
export async function findOportunidades(
  filtros: FiltrosOportunidad,
): Promise<{ items: Oportunidad[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.estado) {
    request.input("estado", sql.NVarChar(20), filtros.estado);
    condiciones.push("Estado = @estado");
  }

  if (filtros.etapaCodigo) {
    request.input("etapaCodigo", sql.NVarChar(30), filtros.etapaCodigo);
    condiciones.push("EtapaCodigo = @etapaCodigo");
  }

  if (filtros.contactoId !== undefined) {
    request.input("contactoId", sql.Int, filtros.contactoId);
    condiciones.push("ContactoId = @contactoId");
  }

  if (filtros.responsableId) {
    request.input("responsableId", sql.UniqueIdentifier, filtros.responsableId);
    condiciones.push("ResponsableId = @responsableId");
  }

  const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(
    `SELECT COUNT(*) AS Total FROM dbo.vw_OportunidadResumen ${whereSql}`,
  );

  const total = Number(countResult.recordset[0]?.Total ?? 0);

  const offset = (filtros.page - 1) * filtros.pageSize;

  request.input("offset", sql.Int, offset);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    ${SELECT_VIEW}
    ${whereSql}
    ORDER BY FechaCreacionUtc DESC, OportunidadId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: pageResult.recordset.map(toOportunidad),
    total,
  };
}

export async function findHistorialByOportunidad(
  oportunidadId: number,
): Promise<HistorialEtapa[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT
        h.HistorialId,
        h.EtapaOrigenId,
        eo.Codigo       AS EtapaOrigenCodigo,
        eo.Nombre       AS EtapaOrigenNombre,
        eo.Orden        AS EtapaOrigenOrden,
        eo.PermiteCierre AS EtapaOrigenPermiteCierre,
        eo.EsFinal      AS EtapaOrigenEsFinal,
        eo.Activo       AS EtapaOrigenActivo,
        h.EtapaDestinoId,
        ed.Codigo       AS EtapaDestinoCodigo,
        ed.Nombre       AS EtapaDestinoNombre,
        ed.Orden        AS EtapaDestinoOrden,
        ed.PermiteCierre AS EtapaDestinoPermiteCierre,
        ed.EsFinal      AS EtapaDestinoEsFinal,
        ed.Activo       AS EtapaDestinoActivo,
        h.FechaCambioUtc,
        h.UsuarioId,
        h.UsuarioNombre,
        h.Motivo,
        h.Observacion,
        h.CorrelationId
      FROM dbo.OportunidadEtapaHistorial h
      LEFT JOIN dbo.PipelineEtapas eo ON eo.EtapaId = h.EtapaOrigenId
      INNER JOIN dbo.PipelineEtapas ed ON ed.EtapaId = h.EtapaDestinoId
      WHERE h.OportunidadId = @oportunidadId
      ORDER BY h.FechaCambioUtc ASC, h.HistorialId ASC
    `);

  return result.recordset.map((row: any) => ({
    historialId: row.HistorialId,
    etapaOrigen:
      row.EtapaOrigenId === null || row.EtapaOrigenId === undefined
        ? null
        : toEtapa(row, "EtapaOrigen"),
    etapaDestino: toEtapa(row, "EtapaDestino"),
    fechaCambioUtc: toIso(row.FechaCambioUtc),
    usuarioId: row.UsuarioId ?? null,
    usuarioNombre: row.UsuarioNombre ?? null,
    motivo: row.Motivo ?? null,
    observacion: row.Observacion ?? null,
    correlationId: row.CorrelationId ?? null,
  }));
}

// ---------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------

/**
 * Crea la oportunidad y su primer hito de historial en una sola
 * transacción. El hito inicial no tiene etapa de origen (la oportunidad
 * nace en una etapa, no viene de otra), por eso `EtapaOrigenId` va como
 * NULL literal.
 */
export async function saveOportunidad(
  input: NuevaOportunidad,
  audit: { correlationId: string | null },
): Promise<Oportunidad> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const insertResult = await transaction
      .request()
      .input("contactoId", sql.Int, input.contactoId)
      .input("responsableId", sql.UniqueIdentifier, input.responsableId)
      .input("etapaId", sql.Int, input.etapaId)
      .input("montoEstimado", sql.Decimal(18, 2), input.montoEstimado)
      .input("monedaCodigo", sql.Char(3), input.monedaCodigo)
      .input("creadoId", sql.UniqueIdentifier, input.creadoId)
      .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
      .query(`
        INSERT INTO dbo.Oportunidades
          (ContactoId, ResponsableId, EtapaId, Estado, MontoEstimado, MonedaCodigo,
           FechaCreacionUtc, FechaIngresoEtapaUtc, CreadoFechaUtc, CreadoId, CreadoNombre)
        OUTPUT inserted.OportunidadId
        VALUES
          (@contactoId, @responsableId, @etapaId, N'ACTIVA', @montoEstimado, @monedaCodigo,
           SYSUTCDATETIME(), SYSUTCDATETIME(), SYSUTCDATETIME(), @creadoId, @creadoNombre)
      `);

    const oportunidadId = insertResult.recordset[0].OportunidadId;

    await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .input("etapaDestinoId", sql.Int, input.etapaId)
      .input("usuarioId", sql.UniqueIdentifier, input.creadoId)
      .input("usuarioNombre", sql.NVarChar(200), input.creadoNombre)
      .input("correlationId", sql.NVarChar(64), audit.correlationId)
      .query(`
        INSERT INTO dbo.OportunidadEtapaHistorial
          (OportunidadId, EtapaOrigenId, EtapaDestinoId, FechaCambioUtc,
           UsuarioId, UsuarioNombre, Motivo, Observacion, CorrelationId)
        VALUES
          (@oportunidadId, NULL, @etapaDestinoId, SYSUTCDATETIME(),
           @usuarioId, @usuarioNombre, N'Alta de oportunidad', NULL, @correlationId)
      `);

    const readResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .query(`${SELECT_VIEW} WHERE OportunidadId = @oportunidadId`);

    const persistida = exigirOportunidad(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S06",
      operacion: "CrearOportunidad",
      entidad: "Oportunidad",
      entidadId: oportunidadId,
      resultado: "EXITO",
      valorNuevo: {
        contactoId: persistida.contactoId,
        etapaCodigo: persistida.etapa.codigo,
        estado: persistida.estado,
        montoEstimado: persistida.montoEstimado,
        monedaCodigo: persistida.monedaCodigo,
      },
    });

    await publicarEtapaCambiada(transaction, persistida, null, audit.correlationId);

    await transaction.commit();

    return persistida;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Cambia la etapa y registra el hito, en una sola transacción.
 * `estado`/`fechaResultado` los decide el service: entrar a la etapa de
 * cierre deja la oportunidad en GANADA con fecha de resultado.
 */
export async function actualizarEtapa(
  oportunidadId: number,
  etapaDestinoId: number,
  etapaOrigenId: number,
  cambio: CambioEtapa,
): Promise<Oportunidad> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    // Estándar de concurrencia: la lectura que validó el avance (etapa
    // origen y estado ACTIVA) viaja en el WHERE. Si otra sesión ya movió
    // la oportunidad, no se afecta ninguna fila y NO se escribe un
    // segundo hito idéntico en el historial.
    const updateResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .input("etapaOrigenId", sql.Int, etapaOrigenId)
      .input("etapaDestinoId", sql.Int, etapaDestinoId)
      .input("estado", sql.NVarChar(20), cambio.estado)
      .input("fechaResultado", sql.DateTime2, cambio.fechaResultado)
      .input("usuarioId", sql.UniqueIdentifier, cambio.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), cambio.usuarioNombre)
      .query(`
        UPDATE dbo.Oportunidades
        SET EtapaId = @etapaDestinoId,
            FechaIngresoEtapaUtc = SYSUTCDATETIME(),
            Estado = @estado,
            FechaResultadoUtc = @fechaResultado,
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        WHERE OportunidadId = @oportunidadId
          AND EtapaId = @etapaOrigenId
          AND Estado = N'ACTIVA'
      `);

    if (filasAfectadas(updateResult) !== 1) {
      throw new PipelineConflictoConcurrenciaError(
        "La oportunidad cambió de etapa o de estado mientras se procesaba el avance; reintente",
      );
    }

    await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .input("etapaOrigenId", sql.Int, etapaOrigenId)
      .input("etapaDestinoId", sql.Int, etapaDestinoId)
      .input("usuarioId", sql.UniqueIdentifier, cambio.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), cambio.usuarioNombre)
      .input("observacion", sql.NVarChar(1000), cambio.observacion)
      .input("correlationId", sql.NVarChar(64), cambio.correlationId)
      .query(`
        INSERT INTO dbo.OportunidadEtapaHistorial
          (OportunidadId, EtapaOrigenId, EtapaDestinoId, FechaCambioUtc,
           UsuarioId, UsuarioNombre, Motivo, Observacion, CorrelationId)
        VALUES
          (@oportunidadId, @etapaOrigenId, @etapaDestinoId, SYSUTCDATETIME(),
           @usuarioId, @usuarioNombre, N'Avance de etapa', @observacion, @correlationId)
      `);

    const readResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .query(`${SELECT_VIEW} WHERE OportunidadId = @oportunidadId`);

    const persistida = exigirOportunidad(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S06",
      operacion: "AvanzarEtapa",
      entidad: "Oportunidad",
      entidadId: oportunidadId,
      resultado: "EXITO",
      valorAnterior: { etapaId: etapaOrigenId, estado: "ACTIVA" },
      valorNuevo: {
        etapaId: persistida.etapa.etapaId,
        etapaCodigo: persistida.etapa.codigo,
        estado: persistida.estado,
      },
      detalle: cambio.observacion ? { observacion: cambio.observacion } : undefined,
    });

    await publicarEtapaCambiada(
      transaction,
      persistida,
      etapaOrigenId,
      cambio.correlationId,
    );

    await transaction.commit();

    return persistida;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Marca la oportunidad como PERDIDA. No inserta hito de etapa: perder no
 * es un cambio de etapa, y el motivo queda en la propia fila (la
 * auditoría de la operación la cubre S40).
 */
export async function marcarPerdida(
  oportunidadId: number,
  motivo: string,
  auditoria: { usuarioId: string; usuarioNombre: string },
): Promise<Oportunidad> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    // Condicional por estado: dos "perder" simultáneos, o un "perder"
    // contra un avance al cierre, no pueden pisarse.
    const updateResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .input("motivo", sql.NVarChar(300), motivo)
      .input("usuarioId", sql.UniqueIdentifier, auditoria.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), auditoria.usuarioNombre)
      .query(`
        UPDATE dbo.Oportunidades
        SET Estado = N'PERDIDA',
            MotivoPerdida = @motivo,
            FechaResultadoUtc = SYSUTCDATETIME(),
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        WHERE OportunidadId = @oportunidadId
          AND Estado = N'ACTIVA'
      `);

    if (filasAfectadas(updateResult) !== 1) {
      throw new PipelineConflictoConcurrenciaError(
        "La oportunidad cambió de estado mientras se procesaba la operación; reintente",
      );
    }

    const readResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, oportunidadId)
      .query(`${SELECT_VIEW} WHERE OportunidadId = @oportunidadId`);

    const persistida = exigirOportunidad(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S06",
      operacion: "PerderOportunidad",
      entidad: "Oportunidad",
      entidadId: oportunidadId,
      resultado: "EXITO",
      valorAnterior: { estado: "ACTIVA" },
      valorNuevo: { estado: persistida.estado, motivo: persistida.motivoPerdida },
    });

    await transaction.commit();

    return persistida;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ---------------------------------------------------------------------
// Habilitación del cierre
// ---------------------------------------------------------------------

export async function existeKycValidado(
  oportunidadId: number,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM dbo.KycExpedientes
        WHERE OportunidadId = @oportunidadId AND Estado = N'VALIDADO'
      ) THEN 1 ELSE 0 END AS Existe
    `);

  return Number(result.recordset[0]?.Existe ?? 0) === 1;
}

export async function existeCierreRegistrado(
  oportunidadId: number,
): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM dbo.CierresInversion
        WHERE OportunidadId = @oportunidadId AND Estado = N'REGISTRADO'
      ) THEN 1 ELSE 0 END AS Existe
    `);

  return Number(result.recordset[0]?.Existe ?? 0) === 1;
}
