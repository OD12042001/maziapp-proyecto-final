import { getPool, sql } from "../../config/sql";
import { Ejecutor, registrarEvento } from "../auditoria/auditoria.repository";
import { publicarEvento } from "../esb/outbox.repository";

/**
 * Acceso a datos del módulo Comisiones y reversión (S16/S17).
 *
 * Garantías:
 *  - Toda columna seleccionada lleva alias explícito (lección de L10).
 *  - El alta de comisión (`registrarComisionEnTx`) es idempotente por
 *    `CierreId` (`UQ_Comisiones_Cierre` + `WHERE NOT EXISTS`) y puede
 *    ejecutarse dentro de la transacción de un consumidor del ESB.
 *  - La reversión (`revertirComision`) exige `Estado = N'PENDIENTE'` en
 *    el `WHERE` con `rowsAffected = 1`, conserva la fila original de la
 *    comisión (`Estado = 'REVERTIDA'`), anexa el detalle en
 *    `dbo.ComisionReversiones`, audita en S40 y publica
 *    `ComisionRevertida` en el outbox dentro de la misma transacción.
 */

export interface ComisionReversion {
  reversionId: number;
  comisionId: number;
  motivoCodigo: "KYC_RECHAZADO" | "DESEMBOLSO_NO_CONCRETADO";
  motivoDetalle: string | null;
  estadoKyc: string | null;
  estadoDesembolso: string | null;
  fechaEvaluacionUtc: string;
  fechaReversionUtc: string;
  registradoPorId: string;
  registradoPorNombre: string | null;
  observacion: string | null;
}

export interface Comision {
  comisionId: number;
  cierreId: number;
  oportunidadId: number;
  proyectoNombre: string;
  freelanceId: string;
  monedaCodigo: string;
  montoCaptado: number;
  tasaPorcentaje: number;
  porcentajeIgv: number;
  importeTotal: number;
  baseImponible: number;
  importeIgv: number;
  estado: "PENDIENTE" | "LIQUIDADA" | "REVERTIDA";
  fechaCalculoUtc: string;
  reversion: ComisionReversion | null;
}

export interface NuevaComision {
  cierreId: number;
  freelanceId: string;
  monedaCodigo: string;
  montoCaptado: number;
  tasaPorcentaje: number;
  porcentajeIgv: number;
  importeTotal: number;
  baseImponible: number;
  importeIgv: number;
  creadoId?: string | null;
  creadoNombre?: string | null;
}

export interface NuevaReversion {
  comisionId: number;
  motivoCodigo: "KYC_RECHAZADO" | "DESEMBOLSO_NO_CONCRETADO";
  motivoDetalle: string | null;
  estadoKyc: string | null;
  estadoDesembolso: string | null;
  fechaEvaluacionUtc: Date;
  observacion: string | null;
  usuarioId: string;
  usuarioNombre: string;
}

export interface FiltrosComision {
  estado?: string;
  freelanceId?: string;
  desde?: Date;
  hasta?: Date;
  page: number;
  pageSize: number;
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function filasAfectadas(result: { rowsAffected?: number[] }): number {
  return Number(result.rowsAffected?.[0] ?? 0);
}

const SELECT_COMISION = `
  SELECT
    m.ComisionId            AS ComisionId,
    m.CierreId              AS CierreId,
    c.OportunidadId         AS OportunidadId,
    p.Nombre                AS ProyectoNombre,
    m.FreelanceId           AS FreelanceId,
    RTRIM(m.MonedaCodigo)   AS MonedaCodigo,
    m.MontoCaptado          AS MontoCaptado,
    m.TasaPorcentaje        AS TasaPorcentaje,
    m.PorcentajeIgv         AS PorcentajeIgv,
    m.ImporteTotal          AS ImporteTotal,
    m.BaseImponible         AS BaseImponible,
    m.ImporteIgv            AS ImporteIgv,
    m.Estado                AS Estado,
    m.FechaCalculoUtc       AS FechaCalculoUtc,
    r.ReversionId           AS ReversionId,
    r.MotivoCodigo          AS ReversionMotivoCodigo,
    r.MotivoDetalle         AS ReversionMotivoDetalle,
    r.EstadoKyc             AS ReversionEstadoKyc,
    r.EstadoDesembolso      AS ReversionEstadoDesembolso,
    r.FechaEvaluacionUtc    AS ReversionFechaEvaluacionUtc,
    r.FechaReversionUtc     AS ReversionFechaReversionUtc,
    r.RegistradoPorId       AS ReversionRegistradoPorId,
    r.RegistradoPorNombre   AS ReversionRegistradoPorNombre,
    r.Observacion           AS ReversionObservacion
  FROM dbo.Comisiones m
  INNER JOIN dbo.CierresInversion c
    ON c.CierreId = m.CierreId
  INNER JOIN dbo.Proyectos p
    ON p.ProyectoId = c.ProyectoId
  LEFT JOIN dbo.ComisionReversiones r
    ON r.ComisionId = m.ComisionId
`;

function toComision(row: any): Comision {
  const reversion: ComisionReversion | null = row.ReversionId
    ? {
        reversionId: row.ReversionId,
        comisionId: row.ComisionId,
        motivoCodigo: row.ReversionMotivoCodigo,
        motivoDetalle: row.ReversionMotivoDetalle ?? null,
        estadoKyc: row.ReversionEstadoKyc ?? null,
        estadoDesembolso: row.ReversionEstadoDesembolso ?? null,
        fechaEvaluacionUtc: toIso(row.ReversionFechaEvaluacionUtc) as string,
        fechaReversionUtc: toIso(row.ReversionFechaReversionUtc) as string,
        registradoPorId: String(row.ReversionRegistradoPorId).toLowerCase(),
        registradoPorNombre: row.ReversionRegistradoPorNombre ?? null,
        observacion: row.ReversionObservacion ?? null,
      }
    : null;

  return {
    comisionId: row.ComisionId,
    cierreId: row.CierreId,
    oportunidadId: row.OportunidadId,
    proyectoNombre: row.ProyectoNombre,
    freelanceId: String(row.FreelanceId).toLowerCase(),
    monedaCodigo: String(row.MonedaCodigo).trim(),
    montoCaptado: toNumber(row.MontoCaptado),
    tasaPorcentaje: toNumber(row.TasaPorcentaje),
    porcentajeIgv: toNumber(row.PorcentajeIgv),
    importeTotal: toNumber(row.ImporteTotal),
    baseImponible: toNumber(row.BaseImponible),
    importeIgv: toNumber(row.ImporteIgv),
    estado: row.Estado,
    fechaCalculoUtc: toIso(row.FechaCalculoUtc) as string,
    reversion,
  };
}

function exigirComision(row: any): Comision {
  if (!row) {
    throw new Error("La comisión no pudo releerse después de la escritura");
  }
  return toComision(row);
}

// ---------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------

export async function findComisionById(
  comisionId: number,
): Promise<Comision | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("comisionId", sql.Int, comisionId)
    .query(`${SELECT_COMISION} WHERE m.ComisionId = @comisionId`);

  const row = result.recordset[0];
  return row ? toComision(row) : null;
}

export async function findComisionByCierre(
  cierreId: number,
): Promise<Comision | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("cierreId", sql.Int, cierreId)
    .query(`${SELECT_COMISION} WHERE m.CierreId = @cierreId`);

  const row = result.recordset[0];
  return row ? toComision(row) : null;
}

export async function findComisiones(
  filtros: FiltrosComision,
): Promise<{ items: Comision[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.estado) {
    request.input("estado", sql.NVarChar(20), filtros.estado);
    condiciones.push("m.Estado = @estado");
  }

  if (filtros.freelanceId) {
    request.input("freelanceId", sql.UniqueIdentifier, filtros.freelanceId);
    condiciones.push("m.FreelanceId = @freelanceId");
  }

  if (filtros.desde) {
    request.input("desde", sql.DateTime2, filtros.desde);
    condiciones.push("m.FechaCalculoUtc >= @desde");
  }

  if (filtros.hasta) {
    request.input("hasta", sql.DateTime2, filtros.hasta);
    condiciones.push("m.FechaCalculoUtc <= @hasta");
  }

  const whereSql =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(
    `SELECT COUNT(*) AS Total FROM dbo.Comisiones m ${whereSql}`,
  );
  const total = Number(countResult.recordset[0]?.Total ?? 0);

  request.input("offset", sql.Int, (filtros.page - 1) * filtros.pageSize);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    ${SELECT_COMISION}
    ${whereSql}
    ORDER BY m.FechaCalculoUtc DESC, m.ComisionId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: pageResult.recordset.map(toComision),
    total,
  };
}

// ---------------------------------------------------------------------
// Escritura S16 (Cálculo idempotente por cierre) y S17 (Reversión)
// ---------------------------------------------------------------------

export async function registrarComisionEnTx(
  ejecutor: Ejecutor,
  input: NuevaComision,
  correlationId: string | null = null,
): Promise<Comision> {
  const insertResult = await ejecutor
    .request()
    .input("cierreId", sql.Int, input.cierreId)
    .input("freelanceId", sql.UniqueIdentifier, input.freelanceId)
    .input("monedaCodigo", sql.Char(3), input.monedaCodigo)
    .input("montoCaptado", sql.Decimal(18, 2), input.montoCaptado)
    .input("tasaPorcentaje", sql.Decimal(5, 2), input.tasaPorcentaje)
    .input("porcentajeIgv", sql.Decimal(5, 2), input.porcentajeIgv)
    .input("importeTotal", sql.Decimal(18, 2), input.importeTotal)
    .input("baseImponible", sql.Decimal(18, 2), input.baseImponible)
    .input("importeIgv", sql.Decimal(18, 2), input.importeIgv)
    .input("creadoId", sql.UniqueIdentifier, input.creadoId ?? null)
    .input("creadoNombre", sql.NVarChar(200), input.creadoNombre ?? null)
    .query(`
      INSERT INTO dbo.Comisiones
        (CierreId, FreelanceId, MonedaCodigo, MontoCaptado,
         TasaPorcentaje, PorcentajeIgv, ImporteTotal, BaseImponible, ImporteIgv,
         Estado, FechaCalculoUtc, CreadoFechaUtc, CreadoId, CreadoNombre)
      SELECT
        @cierreId, @freelanceId, @monedaCodigo, @montoCaptado,
        @tasaPorcentaje, @porcentajeIgv, @importeTotal, @baseImponible, @importeIgv,
        N'PENDIENTE', SYSUTCDATETIME(), SYSUTCDATETIME(), @creadoId, @creadoNombre
      WHERE NOT EXISTS (
        SELECT 1 FROM dbo.Comisiones WHERE CierreId = @cierreId
      )
    `);

  const esNueva = filasAfectadas(insertResult) === 1;

  const readResult = await ejecutor
    .request()
    .input("cierreId", sql.Int, input.cierreId)
    .query(`${SELECT_COMISION} WHERE m.CierreId = @cierreId`);

  const persistida = exigirComision(readResult.recordset[0]);

  if (esNueva) {
    await registrarEvento(
      ejecutor,
      {
        servicioCodigo: "S16",
        operacion: "CalcularComision",
        entidad: "Comision",
        entidadId: persistida.comisionId,
        resultado: "EXITO",
        valorNuevo: {
          cierreId: persistida.cierreId,
          oportunidadId: persistida.oportunidadId,
          importeTotal: persistida.importeTotal,
          baseImponible: persistida.baseImponible,
          importeIgv: persistida.importeIgv,
          estado: persistida.estado,
        },
      },
      correlationId
        ? { correlationId, direccionIp: null, userAgent: null }
        : undefined,
    );

    await publicarEvento(ejecutor, {
      tipoEvento: "ComisionCalculada",
      agregado: "Comision",
      agregadoId: persistida.comisionId,
      idempotencyKey: `ComisionCalculada:${persistida.comisionId}`,
      correlationId,
      payload: {
        comisionId: persistida.comisionId,
        cierreId: persistida.cierreId,
        oportunidadId: persistida.oportunidadId,
        freelanceId: persistida.freelanceId,
        monedaCodigo: persistida.monedaCodigo,
        importeTotal: persistida.importeTotal,
        baseImponible: persistida.baseImponible,
        importeIgv: persistida.importeIgv,
      },
    });
  }

  return persistida;
}

export async function revertirComision(
  input: NuevaReversion,
): Promise<Comision | null> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const updateResult = await transaction
      .request()
      .input("comisionId", sql.Int, input.comisionId)
      .input("usuarioId", sql.UniqueIdentifier, input.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), input.usuarioNombre)
      .query(`
        UPDATE dbo.Comisiones
        SET Estado = N'REVERTIDA',
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        WHERE ComisionId = @comisionId
          AND Estado = N'PENDIENTE'
      `);

    if (filasAfectadas(updateResult) !== 1) {
      await transaction.rollback();
      return null;
    }

    await transaction
      .request()
      .input("comisionId", sql.Int, input.comisionId)
      .input("motivoCodigo", sql.NVarChar(30), input.motivoCodigo)
      .input("motivoDetalle", sql.NVarChar(500), input.motivoDetalle)
      .input("estadoKyc", sql.NVarChar(20), input.estadoKyc)
      .input("estadoDesembolso", sql.NVarChar(20), input.estadoDesembolso)
      .input("fechaEvaluacionUtc", sql.DateTime2, input.fechaEvaluacionUtc)
      .input("registradoPorId", sql.UniqueIdentifier, input.usuarioId)
      .input("registradoPorNombre", sql.NVarChar(200), input.usuarioNombre)
      .input("observacion", sql.NVarChar(1000), input.observacion)
      .query(`
        INSERT INTO dbo.ComisionReversiones
          (ComisionId, MotivoCodigo, MotivoDetalle, EstadoKyc, EstadoDesembolso,
           FechaEvaluacionUtc, FechaReversionUtc, RegistradoPorId,
           RegistradoPorNombre, Observacion, CreadoFechaUtc)
        VALUES
          (@comisionId, @motivoCodigo, @motivoDetalle, @estadoKyc, @estadoDesembolso,
           @fechaEvaluacionUtc, SYSUTCDATETIME(), @registradoPorId,
           @registradoPorNombre, @observacion, SYSUTCDATETIME())
      `);

    const readResult = await transaction
      .request()
      .input("comisionId", sql.Int, input.comisionId)
      .query(`${SELECT_COMISION} WHERE m.ComisionId = @comisionId`);

    const persistida = exigirComision(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S17",
      operacion: "RevertirComision",
      entidad: "Comision",
      entidadId: persistida.comisionId,
      resultado: "EXITO",
      valorAnterior: { estado: "PENDIENTE" },
      valorNuevo: {
        estado: persistida.estado,
        motivoCodigo: input.motivoCodigo,
      },
      detalle: {
        estadoKyc: input.estadoKyc,
        estadoDesembolso: input.estadoDesembolso,
        observacion: input.observacion,
      },
    });

    await publicarEvento(transaction, {
      tipoEvento: "ComisionRevertida",
      agregado: "Comision",
      agregadoId: persistida.comisionId,
      idempotencyKey: `ComisionRevertida:${persistida.comisionId}`,
      payload: {
        comisionId: persistida.comisionId,
        cierreId: persistida.cierreId,
        oportunidadId: persistida.oportunidadId,
        motivoCodigo: input.motivoCodigo,
        fechaEvaluacionUtc: persistida.reversion?.fechaEvaluacionUtc ?? null,
      },
    });

    await transaction.commit();

    return persistida;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
