import { getPool, sql } from "../../config/sql";
import { Ejecutor, registrarEvento } from "../auditoria/auditoria.repository";

/**
 * Repositorio de Saga BPM (`dbo.SagaInstancias` y `dbo.SagaPasos`).
 *
 * Relación Proceso empresarial → Servicio SOA (requisito S4 de APF3):
 *   Proceso `KYC_CIERRE_COMISION`:
 *     Paso 1 (S06) — AperturaYAvancePipeline
 *     Paso 2 (S12) — VerificacionYDictamenKyc
 *     Paso 3 (S15) — RegistroCierreInversion
 *     Paso 4 (S16) — CalculoComision (y compensación S17 si se revierte)
 *
 * Toda columna seleccionada lleva alias explícito (lección de L10).
 */

export const PROCESO_SAGA = "KYC_CIERRE_COMISION";

export type EstadoSagaInstancia =
  | "EN_CURSO"
  | "COMPLETADA"
  | "COMPENSADA"
  | "FALLIDA";

export type EstadoSagaPaso =
  | "PENDIENTE"
  | "EN_CURSO"
  | "COMPLETADO"
  | "FALLIDO"
  | "COMPENSADO";

export interface SagaPaso {
  sagaPasoId: string;
  orden: number;
  servicioCodigo: string;
  accion: string;
  estado: EstadoSagaPaso;
  iniciadoUtc: string | null;
  finalizadoUtc: string | null;
  error: string | null;
}

export interface SagaInstancia {
  sagaInstanciaId: string;
  correlationId: string;
  oportunidadId: number;
  responsableId: string;
  proceso: string;
  estado: EstadoSagaInstancia;
  pasoActual: number;
  iniciadaUtc: string;
  finalizadaUtc: string | null;
  ultimoError: string | null;
  pasos: SagaPaso[];
}

export const DEFINICION_PASOS_SAGA: ReadonlyArray<{
  orden: number;
  servicioCodigo: string;
  accion: string;
}> = [
  { orden: 1, servicioCodigo: "S06", accion: "AperturaYAvancePipeline" },
  { orden: 2, servicioCodigo: "S12", accion: "VerificacionYDictamenKyc" },
  { orden: 3, servicioCodigo: "S15", accion: "RegistroCierreInversion" },
  { orden: 4, servicioCodigo: "S16", accion: "CalculoComision" },
];

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function normalizarCorrelation(
  base: string | null | undefined,
  oportunidadId: number,
): string {
  const limpio = (base ?? "").trim();
  if (limpio.length >= 8 && limpio.length <= 64) {
    return limpio;
  }
  return `saga-op-${oportunidadId}-${Date.now()}`.slice(0, 64);
}

/**
 * Obtiene o crea la instancia de saga de la oportunidad dentro de la
 * transacción del consumidor del ESB. Si la `correlationId` ya estuviera
 * tomada por la saga de otra oportunidad, le agrega el sufijo
 * `-op-{oportunidadId}` para respetar `UQ_SagaInstancias_CorrelationId`.
 */
export async function asegurarSagaEnTx(
  ejecutor: Ejecutor,
  oportunidadId: number,
  correlationId: string | null,
): Promise<string> {
  const existente = await ejecutor
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .input("proceso", sql.NVarChar(50), PROCESO_SAGA)
    .query(`
      SELECT SagaInstanciaId AS SagaInstanciaId
      FROM dbo.SagaInstancias
      WHERE OportunidadId = @oportunidadId
        AND Proceso = @proceso
    `);

  if (existente.recordset[0]?.SagaInstanciaId) {
    return String(existente.recordset[0].SagaInstanciaId).toLowerCase();
  }

  const candidata = normalizarCorrelation(correlationId, oportunidadId);

  const colision = await ejecutor
    .request()
    .input("correlationId", sql.NVarChar(64), candidata)
    .query(`
      SELECT 1 AS Existe
      FROM dbo.SagaInstancias
      WHERE CorrelationId = @correlationId
    `);

  const correlationEfectiva = colision.recordset[0]
    ? `${candidata.slice(0, 48)}-op-${oportunidadId}`
    : candidata;

  const insertResult = await ejecutor
    .request()
    .input("correlationId", sql.NVarChar(64), correlationEfectiva)
    .input("oportunidadId", sql.Int, oportunidadId)
    .input("proceso", sql.NVarChar(50), PROCESO_SAGA)
    .query(`
      INSERT INTO dbo.SagaInstancias
        (CorrelationId, OportunidadId, Proceso, Estado, PasoActual, IniciadaUtc)
      OUTPUT inserted.SagaInstanciaId AS SagaInstanciaId
      VALUES
        (@correlationId, @oportunidadId, @proceso, N'EN_CURSO', 1, SYSUTCDATETIME())
    `);

  const sagaInstanciaId = String(
    insertResult.recordset[0].SagaInstanciaId,
  ).toLowerCase();

  for (const def of DEFINICION_PASOS_SAGA) {
    await ejecutor
      .request()
      .input("sagaInstanciaId", sql.UniqueIdentifier, sagaInstanciaId)
      .input("orden", sql.Int, def.orden)
      .input("servicioCodigo", sql.NVarChar(10), def.servicioCodigo)
      .input("accion", sql.NVarChar(100), def.accion)
      .query(`
        INSERT INTO dbo.SagaPasos
          (SagaInstanciaId, Orden, ServicioCodigo, Accion, Estado)
        VALUES
          (@sagaInstanciaId, @orden, @servicioCodigo, @accion, N'PENDIENTE')
      `);
  }

  return sagaInstanciaId;
}

export async function actualizarPasoEnTx(
  ejecutor: Ejecutor,
  sagaInstanciaId: string,
  orden: number,
  cambio: {
    estado: EstadoSagaPaso;
    error?: string | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  const payloadJson = cambio.payload ? JSON.stringify(cambio.payload) : null;

  await ejecutor
    .request()
    .input("sagaInstanciaId", sql.UniqueIdentifier, sagaInstanciaId)
    .input("orden", sql.Int, orden)
    .input("estado", sql.NVarChar(20), cambio.estado)
    .input("error", sql.NVarChar(2000), cambio.error ?? null)
    .input("payload", sql.NVarChar(sql.MAX), payloadJson)
    .query(`
      UPDATE dbo.SagaPasos
      SET Estado = @estado,
          IniciadoUtc = COALESCE(IniciadoUtc, SYSUTCDATETIME()),
          FinalizadoUtc = CASE
            WHEN @estado IN (N'COMPLETADO', N'FALLIDO', N'COMPENSADO')
              THEN SYSUTCDATETIME()
            ELSE FinalizadoUtc
          END,
          Error = COALESCE(@error, Error),
          Payload = COALESCE(@payload, Payload)
      WHERE SagaInstanciaId = @sagaInstanciaId
        AND Orden = @orden
    `);
}

export async function actualizarEstadoInstanciaEnTx(
  ejecutor: Ejecutor,
  sagaInstanciaId: string,
  cambio: {
    pasoActual: number;
    estado: EstadoSagaInstancia;
    finalizada: boolean;
    ultimoError?: string | null;
  },
): Promise<void> {
  await ejecutor
    .request()
    .input("sagaInstanciaId", sql.UniqueIdentifier, sagaInstanciaId)
    .input("pasoActual", sql.Int, cambio.pasoActual)
    .input("estado", sql.NVarChar(20), cambio.estado)
    .input("finalizada", sql.Bit, cambio.finalizada ? 1 : 0)
    .input("ultimoError", sql.NVarChar(2000), cambio.ultimoError ?? null)
    .query(`
      UPDATE dbo.SagaInstancias
      SET PasoActual = CASE
            WHEN @pasoActual > PasoActual THEN @pasoActual
            ELSE PasoActual
          END,
          Estado = @estado,
          FinalizadaUtc = CASE
            WHEN @finalizada = 1 THEN COALESCE(FinalizadaUtc, SYSUTCDATETIME())
            ELSE FinalizadaUtc
          END,
          UltimoError = @ultimoError
      WHERE SagaInstanciaId = @sagaInstanciaId
    `);
}

/**
 * Acción compensatoria de S06 cuando S12 emite un dictamen `RECHAZADO`:
 * si la oportunidad sigue `ACTIVA`, pasa a `PERDIDA` con el motivo de
 * compensación de la saga y se deja constancia en la bitácora (S40).
 */
export async function compensarOportunidadPorKycRechazadoEnTx(
  ejecutor: Ejecutor,
  oportunidadId: number,
  correlationId: string | null,
): Promise<void> {
  const motivo = "Compensación Saga BPM: expediente KYC rechazado";

  const updateResult = await ejecutor
    .request()
    .input("oportunidadId", sql.Int, oportunidadId)
    .input("motivo", sql.NVarChar(300), motivo)
    .query(`
      UPDATE dbo.Oportunidades
      SET Estado = N'PERDIDA',
          MotivoPerdida = @motivo,
          FechaResultadoUtc = SYSUTCDATETIME(),
          ActualizadoFechaUtc = SYSUTCDATETIME(),
          ActualizadoNombre = N'OrquestadorSagaBpm'
      WHERE OportunidadId = @oportunidadId
        AND Estado = N'ACTIVA'
    `);

  if (Number(updateResult.rowsAffected?.[0] ?? 0) === 1) {
    await registrarEvento(
      ejecutor,
      {
        servicioCodigo: "S06",
        operacion: "CompensarOportunidadSaga",
        entidad: "Oportunidad",
        entidadId: oportunidadId,
        resultado: "EXITO",
        valorAnterior: { estado: "ACTIVA" },
        valorNuevo: { estado: "PERDIDA", motivo },
      },
      correlationId
        ? { correlationId, direccionIp: null, userAgent: null }
        : undefined,
    );
  }
}

export async function findSagaByCorrelationId(
  correlationId: string,
): Promise<SagaInstancia | null> {
  const pool = await getPool();

  const instResult = await pool
    .request()
    .input("correlationId", sql.NVarChar(64), correlationId)
    .query(`
      SELECT
        s.SagaInstanciaId AS SagaInstanciaId,
        s.CorrelationId   AS CorrelationId,
        s.OportunidadId   AS OportunidadId,
        o.ResponsableId   AS ResponsableId,
        s.Proceso         AS Proceso,
        s.Estado          AS Estado,
        s.PasoActual      AS PasoActual,
        s.IniciadaUtc     AS IniciadaUtc,
        s.FinalizadaUtc   AS FinalizadaUtc,
        s.UltimoError     AS UltimoError
      FROM dbo.SagaInstancias s
      INNER JOIN dbo.Oportunidades o
        ON o.OportunidadId = s.OportunidadId
      WHERE s.CorrelationId = @correlationId
    `);

  const row = instResult.recordset[0];
  if (!row) return null;

  const pasosResult = await pool
    .request()
    .input("sagaInstanciaId", sql.UniqueIdentifier, row.SagaInstanciaId)
    .query(`
      SELECT
        SagaPasoId     AS SagaPasoId,
        Orden          AS Orden,
        ServicioCodigo AS ServicioCodigo,
        Accion         AS Accion,
        Estado         AS Estado,
        IniciadoUtc    AS IniciadoUtc,
        FinalizadoUtc  AS FinalizadoUtc,
        Error          AS Error
      FROM dbo.SagaPasos
      WHERE SagaInstanciaId = @sagaInstanciaId
      ORDER BY Orden ASC
    `);

  return {
    sagaInstanciaId: String(row.SagaInstanciaId).toLowerCase(),
    correlationId: row.CorrelationId,
    oportunidadId: row.OportunidadId,
    responsableId: String(row.ResponsableId),
    proceso: row.Proceso,
    estado: row.Estado,
    pasoActual: Number(row.PasoActual),
    iniciadaUtc: toIso(row.IniciadaUtc) as string,
    finalizadaUtc: toIso(row.FinalizadaUtc),
    ultimoError: row.UltimoError ?? null,
    pasos: pasosResult.recordset.map((p: any) => ({
      sagaPasoId: String(p.SagaPasoId),
      orden: Number(p.Orden),
      servicioCodigo: p.ServicioCodigo,
      accion: p.Accion,
      estado: p.Estado,
      iniciadoUtc: toIso(p.IniciadoUtc),
      finalizadoUtc: toIso(p.FinalizadoUtc),
      error: p.Error ?? null,
    })),
  };
}
