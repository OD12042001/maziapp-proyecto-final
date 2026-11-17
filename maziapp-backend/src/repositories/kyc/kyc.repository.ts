import { getPool, sql } from "../../config/sql";
import { registrarEvento } from "../auditoria/auditoria.repository";
import { publicarEvento } from "../esb/outbox.repository";

/**
 * Acceso a datos del módulo KYC (S12/S13).
 *
 * Reglas de esta capa:
 * - Todo valor viaja como parámetro `.input(...)`; el único texto
 *   interpolado son fragmentos fijos del código (columnas y operadores).
 * - Toda columna se selecciona con ALIAS EXPLÍCITO y el mapeo usa ese
 *   alias. Es la lección de L10 en S06: una columna sin alias rompe el
 *   mapeo solo contra el motor real, no contra un mock.
 * - Las transiciones de estado son UPDATE condicionales que exigen
 *   `rowsAffected = 1`. Si otra sesión cambió la fila entre la lectura y
 *   la escritura, la operación falla en vez de pisar el cambio.
 */

// ---------------------------------------------------------------------
// Tipos de dominio
// ---------------------------------------------------------------------

export interface DocumentoRequerido {
  documentoRequeridoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  obligatorio: boolean;
  orden: number;
  activo: boolean;
}

export interface KycDocumento {
  kycDocumentoId: number;
  documentoRequeridoId: number;
  codigo: string;
  nombre: string;
  obligatorio: boolean;
  estado: string;
  archivoReferencia: string | null;
  fechaRecepcionUtc: string | null;
  fechaRevisionUtc: string | null;
  revisadoPorId: string | null;
  revisadoPorNombre: string | null;
  observacion: string | null;
}

/**
 * `responsableId` es la cartera del freelance dueño de la oportunidad.
 * No se expone en el contrato HTTP: la capa de servicio lo usa para
 * decidir visibilidad y lo retira antes de responder.
 */
export interface ExpedienteKyc {
  kycExpedienteId: number;
  oportunidadId: number;
  contactoId: number;
  contactoNombre: string | null;
  responsableId: string;
  estado: string;
  fechaInicioUtc: string | null;
  fechaDictamenUtc: string | null;
  dictamenUsuarioId: string | null;
  dictamenUsuarioNombre: string | null;
  observacion: string | null;
}

export interface ExpedienteKycDetalle extends ExpedienteKyc {
  documentos: KycDocumento[];
}

export interface OportunidadKyc {
  oportunidadId: number;
  contactoId: number;
  responsableId: string;
  estado: string;
}

export interface FiltrosExpedienteKyc {
  estado?: string;
  contactoId?: number;
  oportunidadId?: number;
  responsableId?: string;
  page: number;
  pageSize: number;
}

export interface NuevoExpedienteKyc {
  oportunidadId: number;
  contactoId: number;
  creadoId: string;
  creadoNombre: string;
}

export interface RecepcionDocumento {
  expedienteId: number;
  kycDocumentoId: number;
  archivoReferencia: string;
  observacion: string | null;
  usuarioId: string;
  usuarioNombre: string;
}

export interface RevisionDocumento {
  expedienteId: number;
  kycDocumentoId: number;
  estado: string;
  observacion: string | null;
  usuarioId: string;
  usuarioNombre: string;
}

export interface DictamenExpediente {
  expedienteId: number;
  estado: string;
  observacion: string | null;
  usuarioId: string;
  usuarioNombre: string;
}

/**
 * Violación de `UQ_KycExpedientes_Oportunidad`. La carrera entre dos
 * altas concurrentes se resuelve en la base; el servicio la traduce a
 * 409.
 */
export class KycExpedienteDuplicadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycExpedienteDuplicadoError";
  }
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

function toDocumentoRequerido(row: any): DocumentoRequerido {
  return {
    documentoRequeridoId: row.DocumentoRequeridoId,
    codigo: row.Codigo,
    nombre: row.Nombre,
    descripcion: row.Descripcion ?? null,
    obligatorio: !!row.Obligatorio,
    orden: toNumber(row.Orden) ?? 0,
    activo: !!row.Activo,
  };
}

function toDocumento(row: any): KycDocumento {
  return {
    kycDocumentoId: row.KycDocumentoId,
    documentoRequeridoId: row.DocumentoRequeridoId,
    codigo: row.Codigo,
    nombre: row.Nombre,
    obligatorio: !!row.Obligatorio,
    estado: row.Estado,
    archivoReferencia: row.ArchivoReferencia ?? null,
    fechaRecepcionUtc: toIso(row.FechaRecepcionUtc),
    fechaRevisionUtc: toIso(row.FechaRevisionUtc),
    revisadoPorId: row.RevisadoPorId ?? null,
    revisadoPorNombre: row.RevisadoPorNombre ?? null,
    observacion: row.Observacion ?? null,
  };
}

function toExpediente(row: any): ExpedienteKyc {
  return {
    kycExpedienteId: row.KycExpedienteId,
    oportunidadId: row.OportunidadId,
    contactoId: row.ContactoId,
    contactoNombre: row.ContactoNombre ?? null,
    responsableId: row.ResponsableId,
    estado: row.Estado,
    fechaInicioUtc: toIso(row.FechaInicioUtc),
    fechaDictamenUtc: toIso(row.FechaDictamenUtc),
    dictamenUsuarioId: row.DictamenUsuarioId ?? null,
    dictamenUsuarioNombre: row.DictamenUsuarioNombre ?? null,
    observacion: row.Observacion ?? null,
  };
}

const SELECT_EXPEDIENTE = `
  SELECT
    e.KycExpedienteId      AS KycExpedienteId,
    o.OportunidadId        AS OportunidadId,
    e.ContactoId           AS ContactoId,
    COALESCE(c.RazonSocial,
      LTRIM(RTRIM(CONCAT(c.Nombres, N' ', c.Apellidos)))) AS ContactoNombre,
    o.ResponsableId        AS ResponsableId,
    e.Estado               AS Estado,
    e.FechaInicioUtc       AS FechaInicioUtc,
    e.FechaDictamenUtc     AS FechaDictamenUtc,
    e.DictamenUsuarioId    AS DictamenUsuarioId,
    e.DictamenUsuarioNombre AS DictamenUsuarioNombre,
    e.Observacion          AS Observacion
  FROM dbo.KycExpedientes e
  INNER JOIN dbo.Oportunidades o ON o.OportunidadId = e.OportunidadId
  INNER JOIN dbo.Contactos c ON c.Id = e.ContactoId
`;

function filasAfectadas(result: { rowsAffected?: number[] }): number {
  return Number(result.rowsAffected?.[0] ?? 0);
}

/**
 * Publica en el outbox, dentro de la transacción de negocio, que el
 * expediente cambió de estado. La clave (expediente, estado nuevo) es
 * única por hecho: un expediente entra a cada estado a lo sumo una vez
 * (PENDIENTE → EN_PROCESO → dictamen final, sin retroceso).
 */
async function publicarCambioEstadoKyc(
  transaction: { request(): sql.Request },
  cambio: {
    expedienteId: number;
    oportunidadId: number;
    estadoAnterior: string | null;
    estadoNuevo: string;
  },
): Promise<void> {
  await publicarEvento(transaction, {
    tipoEvento: "KycEstadoCambiado",
    agregado: "KycExpediente",
    agregadoId: cambio.expedienteId,
    idempotencyKey: `KycEstadoCambiado:${cambio.expedienteId}:${cambio.estadoNuevo}`,
    payload: {
      expedienteId: cambio.expedienteId,
      oportunidadId: cambio.oportunidadId,
      estadoAnterior: cambio.estadoAnterior,
      estadoNuevo: cambio.estadoNuevo,
    },
  });
}

/**
 * La primera recepción o revisión mueve el expediente de PENDIENTE a
 * EN_PROCESO. `OUTPUT` devuelve la oportunidad solo si la fila cambió
 * de verdad: si el expediente ya estaba EN_PROCESO no se publica nada.
 */
async function marcarExpedienteEnProceso(
  transaction: { request(): sql.Request },
  expedienteId: number,
  usuarioId: string,
  usuarioNombre: string,
): Promise<void> {
  const result = await transaction
    .request()
    .input("kycExpedienteId", sql.Int, expedienteId)
    .input("usuarioId", sql.UniqueIdentifier, usuarioId)
    .input("usuarioNombre", sql.NVarChar(200), usuarioNombre)
    .query(`
      UPDATE dbo.KycExpedientes
      SET Estado = N'EN_PROCESO',
          ActualizadoFechaUtc = SYSUTCDATETIME(),
          ActualizadoId = @usuarioId,
          ActualizadoNombre = @usuarioNombre
      OUTPUT inserted.OportunidadId AS OportunidadId
      WHERE KycExpedienteId = @kycExpedienteId
        AND Estado = N'PENDIENTE'
    `);

  if (filasAfectadas(result) === 1) {
    await publicarCambioEstadoKyc(transaction, {
      expedienteId,
      oportunidadId: result.recordset?.[0]?.OportunidadId ?? 0,
      estadoAnterior: "PENDIENTE",
      estadoNuevo: "EN_PROCESO",
    });
  }
}

function esViolacionDeUnicidad(error: any): boolean {
  const numero = error?.number ?? error?.originalError?.info?.number;

  return numero === 2601 || numero === 2627;
}

function exigirExpediente(row: any): ExpedienteKyc {
  if (!row) {
    throw new Error("El expediente KYC no pudo releerse después de la escritura");
  }

  return toExpediente(row);
}

// ---------------------------------------------------------------------
// Catálogo y oportunidad origen
// ---------------------------------------------------------------------

export async function findDocumentosRequeridos(): Promise<
  DocumentoRequerido[]
> {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT DocumentoRequeridoId, Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo
    FROM dbo.KycDocumentosRequeridos
    ORDER BY Orden ASC, DocumentoRequeridoId ASC
  `);

  return result.recordset.map(toDocumentoRequerido);
}

export async function findDocumentosRequeridosActivos(): Promise<
  DocumentoRequerido[]
> {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT DocumentoRequeridoId, Codigo, Nombre, Descripcion, Obligatorio, Orden, Activo
    FROM dbo.KycDocumentosRequeridos
    WHERE Activo = 1
    ORDER BY Orden ASC, DocumentoRequeridoId ASC
  `);

  return result.recordset.map(toDocumentoRequerido);
}

export async function findOportunidadParaKyc(
  oportunidadId: number,
): Promise<OportunidadKyc | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT
        o.OportunidadId  AS OportunidadId,
        o.ContactoId     AS ContactoId,
        o.ResponsableId  AS ResponsableId,
        o.Estado         AS Estado
      FROM dbo.Oportunidades o
      WHERE o.OportunidadId = @oportunidadId
    `);

  const row = result.recordset[0];

  if (!row) {
    return null;
  }

  return {
    oportunidadId: row.OportunidadId,
    contactoId: row.ContactoId,
    responsableId: row.ResponsableId,
    estado: row.Estado,
  };
}

export async function findExpedienteByOportunidad(
  oportunidadId: number,
): Promise<{ kycExpedienteId: number } | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .query(`
      SELECT KycExpedienteId AS KycExpedienteId
      FROM dbo.KycExpedientes
      WHERE OportunidadId = @oportunidadId
    `);

  const row = result.recordset[0];

  return row ? { kycExpedienteId: row.KycExpedienteId } : null;
}

// ---------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------

export async function findExpedientes(
  filtros: FiltrosExpedienteKyc,
): Promise<{ items: ExpedienteKyc[]; total: number }> {
  const pool = await getPool();
  const request = pool.request();

  const condiciones: string[] = [];

  if (filtros.estado) {
    request.input("estado", sql.NVarChar(20), filtros.estado);
    condiciones.push("e.Estado = @estado");
  }

  if (filtros.contactoId !== undefined) {
    request.input("contactoId", sql.Int, filtros.contactoId);
    condiciones.push("e.ContactoId = @contactoId");
  }

  if (filtros.oportunidadId !== undefined) {
    request.input("oportunidadId", sql.Int, filtros.oportunidadId);
    condiciones.push("e.OportunidadId = @oportunidadId");
  }

  if (filtros.responsableId) {
    request.input("responsableId", sql.UniqueIdentifier, filtros.responsableId);
    condiciones.push("o.ResponsableId = @responsableId");
  }

  const whereSql =
    condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const countResult = await request.query(`
    SELECT COUNT(*) AS Total
    FROM dbo.KycExpedientes e
    INNER JOIN dbo.Oportunidades o ON o.OportunidadId = e.OportunidadId
    ${whereSql}
  `);

  const total = Number(countResult.recordset[0]?.Total ?? 0);

  const offset = (filtros.page - 1) * filtros.pageSize;

  request.input("offset", sql.Int, offset);
  request.input("pageSize", sql.Int, filtros.pageSize);

  const pageResult = await request.query(`
    ${SELECT_EXPEDIENTE}
    ${whereSql}
    ORDER BY e.FechaInicioUtc DESC, e.KycExpedienteId DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return {
    items: pageResult.recordset.map(toExpediente),
    total,
  };
}

export async function findExpedienteById(
  kycExpedienteId: number,
): Promise<ExpedienteKyc | null> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("kycExpedienteId", sql.Int, kycExpedienteId)
    .query(`${SELECT_EXPEDIENTE} WHERE e.KycExpedienteId = @kycExpedienteId`);

  const row = result.recordset[0];

  return row ? toExpediente(row) : null;
}

export async function findDocumentosByExpediente(
  kycExpedienteId: number,
): Promise<KycDocumento[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("kycExpedienteId", sql.Int, kycExpedienteId)
    .query(`
      SELECT
        d.KycDocumentoId        AS KycDocumentoId,
        d.DocumentoRequeridoId  AS DocumentoRequeridoId,
        r.Codigo                AS Codigo,
        r.Nombre                AS Nombre,
        r.Obligatorio           AS Obligatorio,
        d.Estado                AS Estado,
        d.ArchivoReferencia     AS ArchivoReferencia,
        d.FechaRecepcionUtc     AS FechaRecepcionUtc,
        d.FechaRevisionUtc      AS FechaRevisionUtc,
        d.RevisadoPorId         AS RevisadoPorId,
        d.RevisadoPorNombre     AS RevisadoPorNombre,
        d.Observacion           AS Observacion
      FROM dbo.KycDocumentos d
      INNER JOIN dbo.KycDocumentosRequeridos r
        ON r.DocumentoRequeridoId = d.DocumentoRequeridoId
      WHERE d.KycExpedienteId = @kycExpedienteId
      ORDER BY r.Orden ASC, d.KycDocumentoId ASC
    `);

  return result.recordset.map(toDocumento);
}

// ---------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------

/**
 * Crea el expediente y su checklist desde el catálogo activo dentro de
 * una transacción: un expediente sin checklist no es un expediente.
 */
export async function saveExpediente(
  input: NuevoExpedienteKyc,
): Promise<ExpedienteKyc> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const insertResult = await transaction
      .request()
      .input("oportunidadId", sql.Int, input.oportunidadId)
      .input("contactoId", sql.Int, input.contactoId)
      .input("creadoId", sql.UniqueIdentifier, input.creadoId)
      .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
      .query(`
        INSERT INTO dbo.KycExpedientes
          (OportunidadId, ContactoId, Estado, FechaInicioUtc,
           CreadoFechaUtc, CreadoId, CreadoNombre)
        OUTPUT inserted.KycExpedienteId AS KycExpedienteId
        VALUES
          (@oportunidadId, @contactoId, N'PENDIENTE', SYSUTCDATETIME(),
           SYSUTCDATETIME(), @creadoId, @creadoNombre)
      `);

    const kycExpedienteId = insertResult.recordset[0].KycExpedienteId;

    await transaction
      .request()
      .input("kycExpedienteId", sql.Int, kycExpedienteId)
      .input("creadoId", sql.UniqueIdentifier, input.creadoId)
      .input("creadoNombre", sql.NVarChar(200), input.creadoNombre)
      .query(`
        INSERT INTO dbo.KycDocumentos
          (KycExpedienteId, DocumentoRequeridoId, Estado,
           CreadoFechaUtc, CreadoId, CreadoNombre)
        SELECT
          @kycExpedienteId, r.DocumentoRequeridoId, N'PENDIENTE',
          SYSUTCDATETIME(), @creadoId, @creadoNombre
        FROM dbo.KycDocumentosRequeridos r
        WHERE r.Activo = 1
      `);

    const readResult = await transaction
      .request()
      .input("kycExpedienteId", sql.Int, kycExpedienteId)
      .query(
        `${SELECT_EXPEDIENTE} WHERE e.KycExpedienteId = @kycExpedienteId`,
      );

    const persistido = exigirExpediente(readResult.recordset[0]);

    await registrarEvento(transaction, {
      servicioCodigo: "S12",
      operacion: "CrearExpediente",
      entidad: "KycExpediente",
      entidadId: kycExpedienteId,
      resultado: "EXITO",
      valorNuevo: {
        oportunidadId: persistido.oportunidadId,
        contactoId: persistido.contactoId,
        estado: persistido.estado,
      },
    });

    await publicarCambioEstadoKyc(transaction, {
      expedienteId: persistido.kycExpedienteId,
      oportunidadId: persistido.oportunidadId,
      estadoAnterior: null,
      estadoNuevo: persistido.estado,
    });

    await transaction.commit();

    return persistido;
  } catch (error) {
    await transaction.rollback();

    if (esViolacionDeUnicidad(error)) {
      throw new KycExpedienteDuplicadoError(
        "La oportunidad ya tiene un expediente KYC",
      );
    }

    throw error;
  }
}

/**
 * Registra la recepción de un documento. La fila del documento solo se
 * actualiza si sigue en un estado que admite recepción; el expediente
 * pasa a EN_PROCESO en la misma transacción.
 */
export async function registrarRecepcion(
  input: RecepcionDocumento,
): Promise<boolean> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const updateResult = await transaction
      .request()
      .input("kycExpedienteId", sql.Int, input.expedienteId)
      .input("kycDocumentoId", sql.Int, input.kycDocumentoId)
      .input("archivoReferencia", sql.NVarChar(500), input.archivoReferencia)
      .input("observacion", sql.NVarChar(1000), input.observacion)
      .input("usuarioId", sql.UniqueIdentifier, input.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), input.usuarioNombre)
      .query(`
        UPDATE dbo.KycDocumentos
        SET Estado = N'RECIBIDO',
            ArchivoReferencia = @archivoReferencia,
            FechaRecepcionUtc = COALESCE(FechaRecepcionUtc, SYSUTCDATETIME()),
            Observacion = COALESCE(@observacion, Observacion),
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        WHERE KycDocumentoId = @kycDocumentoId
          AND KycExpedienteId = @kycExpedienteId
          AND Estado IN (N'PENDIENTE', N'RECIBIDO')
      `);

    if (filasAfectadas(updateResult) !== 1) {
      await transaction.rollback();
      return false;
    }

    await marcarExpedienteEnProceso(
      transaction,
      input.expedienteId,
      input.usuarioId,
      input.usuarioNombre,
    );

    await registrarEvento(transaction, {
      servicioCodigo: "S12",
      operacion: "RegistrarDocumento",
      entidad: "KycExpediente",
      entidadId: input.expedienteId,
      resultado: "EXITO",
      valorNuevo: { estado: "RECIBIDO" },
      detalle: {
        kycDocumentoId: input.kycDocumentoId,
        archivoReferencia: input.archivoReferencia,
      },
    });

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Cambia el estado de revisión de un documento. `VALIDADO`/`RECHAZADO`
 * solo proceden desde `RECIBIDO`; `RECIBIDO` es idempotente desde
 * `PENDIENTE` o `RECIBIDO`. La condición viaja en el `WHERE`: si otra
 * sesión revisó el documento antes, `rowsAffected` es 0 y no se pisa.
 */
export async function revisarDocumento(
  input: RevisionDocumento,
): Promise<boolean> {
  const pool = await getPool();
  const transaction = pool.transaction();

  const condicionEstado =
    input.estado === "RECIBIDO"
      ? "AND Estado IN (N'PENDIENTE', N'RECIBIDO')"
      : "AND Estado = N'RECIBIDO'";

  await transaction.begin();

  try {
    const updateResult = await transaction
      .request()
      .input("kycExpedienteId", sql.Int, input.expedienteId)
      .input("kycDocumentoId", sql.Int, input.kycDocumentoId)
      .input("estado", sql.NVarChar(20), input.estado)
      .input("observacion", sql.NVarChar(1000), input.observacion)
      .input("usuarioId", sql.UniqueIdentifier, input.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), input.usuarioNombre)
      .query(`
        UPDATE dbo.KycDocumentos
        SET Estado = @estado,
            FechaRecepcionUtc = CASE
              WHEN @estado = N'RECIBIDO' AND FechaRecepcionUtc IS NULL
                THEN SYSUTCDATETIME()
              ELSE FechaRecepcionUtc
            END,
            FechaRevisionUtc = CASE
              WHEN @estado IN (N'VALIDADO', N'RECHAZADO')
                THEN SYSUTCDATETIME()
              ELSE FechaRevisionUtc
            END,
            RevisadoPorId = CASE
              WHEN @estado IN (N'VALIDADO', N'RECHAZADO')
                THEN @usuarioId
              ELSE RevisadoPorId
            END,
            RevisadoPorNombre = CASE
              WHEN @estado IN (N'VALIDADO', N'RECHAZADO')
                THEN @usuarioNombre
              ELSE RevisadoPorNombre
            END,
            Observacion = COALESCE(@observacion, Observacion),
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        WHERE KycDocumentoId = @kycDocumentoId
          AND KycExpedienteId = @kycExpedienteId
          ${condicionEstado}
      `);

    if (filasAfectadas(updateResult) !== 1) {
      await transaction.rollback();
      return false;
    }

    await marcarExpedienteEnProceso(
      transaction,
      input.expedienteId,
      input.usuarioId,
      input.usuarioNombre,
    );

    await registrarEvento(transaction, {
      servicioCodigo: "S12",
      operacion: "RevisarDocumento",
      entidad: "KycExpediente",
      entidadId: input.expedienteId,
      resultado: "EXITO",
      valorNuevo: { estado: input.estado },
      detalle: {
        kycDocumentoId: input.kycDocumentoId,
        observacion: input.observacion,
      },
    });

    await transaction.commit();

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Documentos obligatorios activos que todavía no están VALIDADOS.
 * Se evalúa dentro de la transacción del dictamen.
 */
export async function contarDocumentosObligatoriosPendientes(
  kycExpedienteId: number,
): Promise<number> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("kycExpedienteId", sql.Int, kycExpedienteId)
    .query(`
      SELECT COUNT(*) AS Pendientes
      FROM dbo.KycDocumentos d
      INNER JOIN dbo.KycDocumentosRequeridos r
        ON r.DocumentoRequeridoId = d.DocumentoRequeridoId
      WHERE d.KycExpedienteId = @kycExpedienteId
        AND r.Activo = 1
        AND r.Obligatorio = 1
        AND d.Estado <> N'VALIDADO'
    `);

  return Number(result.recordset[0]?.Pendientes ?? 0);
}

/**
 * Emite el dictamen final. `FechaDictamenUtc` se escribe en la MISMA
 * sentencia que el estado: el CHECK `CK_KycExpedientes_Dictamen` exige
 * que no exista dictamen sin fecha. La condición de estado abierto forma
 * parte del `WHERE`, así que un segundo dictamen concurrente falla.
 */
export async function dictaminarExpediente(
  input: DictamenExpediente,
): Promise<ExpedienteKyc | null> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const updateResult = await transaction
      .request()
      .input("kycExpedienteId", sql.Int, input.expedienteId)
      .input("estado", sql.NVarChar(20), input.estado)
      .input("observacion", sql.NVarChar(1000), input.observacion)
      .input("usuarioId", sql.UniqueIdentifier, input.usuarioId)
      .input("usuarioNombre", sql.NVarChar(200), input.usuarioNombre)
      .query(`
        UPDATE dbo.KycExpedientes
        SET Estado = @estado,
            FechaDictamenUtc = SYSUTCDATETIME(),
            DictamenUsuarioId = @usuarioId,
            DictamenUsuarioNombre = @usuarioNombre,
            Observacion = COALESCE(@observacion, Observacion),
            ActualizadoFechaUtc = SYSUTCDATETIME(),
            ActualizadoId = @usuarioId,
            ActualizadoNombre = @usuarioNombre
        OUTPUT deleted.Estado AS EstadoAnterior
        WHERE KycExpedienteId = @kycExpedienteId
          AND Estado IN (N'PENDIENTE', N'EN_PROCESO')
      `);

    if (filasAfectadas(updateResult) !== 1) {
      await transaction.rollback();
      return null;
    }

    const readResult = await transaction
      .request()
      .input("kycExpedienteId", sql.Int, input.expedienteId)
      .query(
        `${SELECT_EXPEDIENTE} WHERE e.KycExpedienteId = @kycExpedienteId`,
      );

    const persistido = exigirExpediente(readResult.recordset[0]);

    const estadoAnterior: string | null =
      updateResult.recordset?.[0]?.EstadoAnterior ?? null;

    await registrarEvento(transaction, {
      servicioCodigo: "S12",
      operacion: "DictaminarExpediente",
      entidad: "KycExpediente",
      entidadId: input.expedienteId,
      resultado: "EXITO",
      valorAnterior: { estado: estadoAnterior },
      valorNuevo: { estado: persistido.estado },
      detalle: input.observacion ? { observacion: input.observacion } : undefined,
    });

    await publicarCambioEstadoKyc(transaction, {
      expedienteId: persistido.kycExpedienteId,
      oportunidadId: persistido.oportunidadId,
      estadoAnterior,
      estadoNuevo: persistido.estado,
    });

    await transaction.commit();

    return persistido;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
