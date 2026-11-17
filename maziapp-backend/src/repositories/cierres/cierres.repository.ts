import { getPool, sql } from "../../config/sql";
import { registrarEvento } from "../auditoria/auditoria.repository";
import { publicarEvento } from "../esb/outbox.repository";

/**
 * Acceso a datos del módulo Cierres de inversión (S15).
 *
 * Reglas de esta capa:
 *  - Toda columna seleccionada lleva alias explícito (lección de L10).
 *  - `saveCierre` corre en transacción y escribe en la misma unidad el
 *    cierre, el evento de auditoría (S40) y el evento de dominio
 *    `CierreGanadoRegistrado` en el outbox (ESB lógico).
 *  - `UQ_CierresInversion_Oportunidad` garantiza a lo sumo un cierre por
 *    oportunidad incluso ante dos altas concurrentes.
 */

export interface Proyecto {
  proyectoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  monedaCodigo: string;
  montoObjetivo: number | null;
  activo: boolean;
}

export interface Cierre {
  cierreId: number;
  oportunidadId: number;
  proyecto: Proyecto;
  montoCaptado: number;
  monedaCodigo: string;
  fechaCierreUtc: string;
  freelanceId: string;
  estado: "REGISTRADO" | "ANULADO";
  fechaAnulacionUtc: string | null;
  motivoAnulacion: string | null;
  registradoPorId: string;
  registradoPorNombre: string | null;
  comisionId: number | null;
  comisionEstado: "PENDIENTE" | "LIQUIDADA" | "REVERTIDA" | null;
}

export interface OportunidadParaCierre {
  oportunidadId: number;
  responsableId: string;
  estado: string;
  kycEstado: string | null;
}

export interface NuevoCierre {
  oportunidadId: number;
  proyectoId: number;
  montoCaptado: number;
  monedaCodigo: string;
  fechaCierreUtc: Date;
  freelanceId: string;
  registradoPorId: string;
  registradoPorNombre: string;
}

export interface FiltrosCierre {
  proyectoId?: number;
  freelanceId?: string;
  estado?: string;
  desde?: Date;
  hasta?: Date;
  page: number;
  pageSize: number;
}

export class CierreDuplicadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CierreDuplicadoError";
  }
}

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

function esViolacionDeUnicidad(error: any): boolean {
  const numero = error?.number ?? error?.originalError?.info?.number;
  return numero === 2627 || numero === 2601;
}

const SELECT_CIERRE = `
  SELECT
    c.CierreId              AS CierreId,
    c.OportunidadId         AS OportunidadId,
    c.MontoCaptado          AS MontoCaptado,
    RTRIM(c.MonedaCodigo)   AS MonedaCodigo,
    c.FechaCierreUtc        AS FechaCierreUtc,
    c.FreelanceId           AS FreelanceId,
    c.Estado                AS Estado,
    c.FechaAnulacionUtc     AS FechaAnulacionUtc,
    c.MotivoAnulacion       AS MotivoAnulacion,
    c.RegistradoPorId       AS RegistradoPorId,
    c.RegistradoPorNombre   AS RegistradoPorNombre,
    p.ProyectoId            AS ProyectoId,
    p.Codigo                AS ProyectoCodigo,
    p.Nombre                AS ProyectoNombre,
    p.Descripcion           AS ProyectoDescripcion,
    RTRIM(p.MonedaCodigo)   AS ProyectoMonedaCodigo,
    p.MontoObjetivo         AS ProyectoMontoObjetivo,
    p.Activo                AS ProyectoActivo,
    m.ComisionId            AS ComisionId,
    m.Estado                AS ComisionEstado
  FROM dbo.CierresInversion c
  INNER JOIN dbo.Proyectos p
    ON p.ProyectoId = c.ProyectoId
  LEFT JOIN dbo.Comisiones m
    ON m.CierreId = c.CierreId
`;

function toCierre(row: any): Cierre {
  return {
    cierreId: row.CierreId,
    oportunidadId: row.OportunidadId,
    proyecto: {
      proyectoId: row.ProyectoId,
      codigo: row.ProyectoCodigo,
      nombre: row.ProyectoNombre,
      descripcion: row.ProyectoDescripcion ?? null,
      monedaCodigo: String(row.ProyectoMonedaCodigo).trim(),
      montoObjetivo: toNumber(row.ProyectoMontoObjetivo),
      activo: !!row.ProyectoActivo,
    },
    montoCaptado: toNumber(row.MontoCaptado) ?? 0,
    monedaCodigo: String(row.MonedaCodigo).trim(),
    fechaCierreUtc: toIso(row.FechaCierreUtc) as string,
    freelanceId: String(row.FreelanceId).toLowerCase(),
    estado: row.Estado,
    fechaAnulacionUtc: toIso(row.FechaAnulacionUtc),
    motivoAnulacion: row.MotivoAnulacion ?? null,
    registradoPorId: String(row.RegistradoPorId).toLowerCase(),
    registradoPorNombre: row.RegistradoPorNombre ?? null,
    comisionId: toId(row.ComisionId),
    comisionEstado: row.ComisionEstado ?? null,
  };
}

function exigirCierre(row: any): Cierre {
  if (!row) {
    throw new Error("El cierre de inversión no pudo releerse después de la escritura");
  }
  return toCierre(row);
}

// ---------------------------------------------------------------------
// Lecturas de soporte y validación
// ---------------------------------------------------------------------

export async function findOportunidadParaCierre(
  oportunidadId: number,
): Promise<OportunidadParaCierre | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT
        o.OportunidadId AS OportunidadId,
        o.ResponsableId AS ResponsableId,
        o.Estado        AS Estado,
        k.Estado        AS KycEstado
      FROM dbo.Oportunidades o
      LEFT JOIN dbo.KycExpedientes k
        ON k.OportunidadId = o.OportunidadId
      WHERE o.OportunidadId = @oportunidadId
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    oportunidadId: row.OportunidadId,
    responsableId: String(row.ResponsableId),
    estado: row.Estado,
    kycEstado: row.KycEstado ?? null,
  };
}

export async function findProyectoById(
  proyectoId: number,
): Promise<Proyecto | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("proyectoId", sql.Int, proyectoId)
    .query(`
      SELECT
        ProyectoId            AS ProyectoId,
        Codigo                AS Codigo,
        Nombre                AS Nombre,
        Descripcion           AS Descripcion,
        RTRIM(MonedaCodigo)   AS MonedaCodigo,
        MontoObjetivo         AS MontoObjetivo,
        Activo                AS Activo
      FROM dbo.Proyectos
      WHERE ProyectoId = @proyectoId
    `);

  const row = result.recordset[0];
  if (!row) return null;

  return {
    proyectoId: row.ProyectoId,
    codigo: row.Codigo,
    nombre: row.Nombre,
    descripcion: row.Descripcion ?? null,
    monedaCodigo: String(row.MonedaCodigo).trim(),
    montoObjetivo: toNumber(row.MontoObjetivo),
    activo: !!row.Activo,
  };
}

export async function findMonedaActiva(codigo: string): Promise<boolean> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("codigo", sql.Char(3), codigo)
    .query(`
      SELECT MonedaCodigo AS MonedaCodigo
      FROM dbo.Monedas
      WHERE MonedaCodigo = @codigo AND Activo = 1
    `);

  return Boolean(result.recordset[0]);
}

export async function findCierreByOportunidad(
  oportunidadId: number,
): Promise<Cierre | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`${SELECT_CIERRE} WHERE c.OportunidadId = @oportunidadId`);

  const row = result.recordset[0];
  return row ? toCierre(row) : null;
}

export async function findCierreById(
  cierreId: number,
): Promise<Cierre | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("cierreId", sql.Int, cierreId)
    .query(`${SELECT_CIERRE} WHERE c.CierreId = @cierreId`);

  const row = result.recordset[0];
  return row ? toCierre(row) : null;
}

export async function findCierres(
  filtros: FiltrosCierre,
): Promise<{ items: Cierre[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.proyectoId !== undefined) {
    request.input("proyectoId", sql.Int, filtros.proyectoId);
    condiciones.push("c.ProyectoId = @proyectoId");
  }

  if (filtros.freelanceId) {
    request.input("freelanceId", sql.UniqueIdentifier, filtros.freelanceId);
    condiciones.push("c.FreelanceId = @freelanceId");
  }

  if (filtros.estado) {
    request.input("estado", sql.NVarChar(20), filtros.estado);
    condiciones.push("c.Estado = @estado");
  }

  if (filtros.desde) {
    request.input("desde", sql.DateTime2, filtros.desde);
    condiciones.push("c.FechaCierreUtc >= @desde");
  }

  if (filtros.hasta) {
    request.input("hasta", sql.DateTime2, filtros.hasta);
    condiciones.push("c.FechaCierreUtc <= @hasta");
  }

  const whereSql =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(
    `SELECT COUNT(*) AS Total FROM dbo.CierresInversion c ${whereSql}`,
  );
  const total = Number(countResult.recordset[0]?.Total ?? 0);

  request.input("offset", sql.Int, (filtros.page - 1) * filtros.pageSize);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    ${SELECT_CIERRE}
    ${whereSql}
    ORDER BY c.FechaCierreUtc DESC, c.CierreId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: pageResult.recordset.map(toCierre),
    total,
  };
}

// ---------------------------------------------------------------------
// Escritura transaccional
// ---------------------------------------------------------------------

export async function saveCierre(input: NuevoCierre): Promise<Cierre> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const insertResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, input.oportunidadId)
      .input("proyectoId", sql.Int, input.proyectoId)
      .input("montoCaptado", sql.Decimal(18, 2), input.montoCaptado)
      .input("monedaCodigo", sql.Char(3), input.monedaCodigo)
      .input("fechaCierreUtc", sql.DateTime2, input.fechaCierreUtc)
      .input("freelanceId", sql.UniqueIdentifier, input.freelanceId)
      .input("registradoPorId", sql.UniqueIdentifier, input.registradoPorId)
      .input("registradoPorNombre", sql.NVarChar(200), input.registradoPorNombre)
      .query(`
        INSERT INTO dbo.CierresInversion
          (OportunidadId, ProyectoId, MontoCaptado, MonedaCodigo,
           FechaCierreUtc, FreelanceId, Estado,
           RegistradoPorId, RegistradoPorNombre, CreadoFechaUtc)
        OUTPUT inserted.CierreId AS CierreId
        VALUES
          (@oportunidadId, @proyectoId, @montoCaptado, @monedaCodigo,
           @fechaCierreUtc, @freelanceId, N'REGISTRADO',
           @registradoPorId, @registradoPorNombre, SYSUTCDATETIME())
      `);

    const cierreId = insertResult.recordset[0].CierreId;

    const readResult = await transaction
      .request()
      .input("cierreId", sql.Int, cierreId)
      .query(`${SELECT_CIERRE} WHERE c.CierreId = @cierreId`);

    const persistido = exigirCierre(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S15",
      operacion: "RegistrarCierre",
      entidad: "CierreInversion",
      entidadId: cierreId,
      resultado: "EXITO",
      valorNuevo: {
        oportunidadId: persistido.oportunidadId,
        proyectoId: persistido.proyecto.proyectoId,
        montoCaptado: persistido.montoCaptado,
        monedaCodigo: persistido.monedaCodigo,
        freelanceId: persistido.freelanceId,
        estado: persistido.estado,
      },
    });

    await publicarEvento(transaction, {
      tipoEvento: "CierreGanadoRegistrado",
      agregado: "CierreInversion",
      agregadoId: cierreId,
      idempotencyKey: `CierreGanadoRegistrado:${cierreId}`,
      payload: {
        cierreId,
        oportunidadId: persistido.oportunidadId,
        proyectoId: persistido.proyecto.proyectoId,
        freelanceId: persistido.freelanceId,
        montoCaptado: persistido.montoCaptado,
        monedaCodigo: persistido.monedaCodigo,
        fechaCierreUtc: persistido.fechaCierreUtc,
      },
    });

    await transaction.commit();

    return persistido;
  } catch (error) {
    await transaction.rollback();

    if (esViolacionDeUnicidad(error)) {
      throw new CierreDuplicadoError(
        "La oportunidad ya tiene un cierre de inversión registrado",
      );
    }

    throw error;
  }
}
