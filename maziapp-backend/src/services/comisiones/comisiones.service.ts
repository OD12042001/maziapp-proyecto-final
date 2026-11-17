import { APP_ROLES } from "../../config/roles";
import { Ejecutor } from "../../repositories/auditoria/auditoria.repository";
import * as cierresRepository from "../../repositories/cierres/cierres.repository";
import * as repository from "../../repositories/comisiones/comisiones.repository";
import * as configuracion from "../../repositories/configuracion/configuracion.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";
import {
  ListarComisionesQuery,
  RevertirComisionInput,
} from "../../validators/comisiones.validator";
import { conAuditoriaDeRechazo } from "../auditoria/auditoria.service";

/**
 * Servicio de Comisiones y reversión (S16/S17).
 *
 * Reglas de negocio:
 *  - S16: la comisión se calcula sobre el monto captado con
 *    `COMISION_TASA_PORCENTAJE` (3.00 %) incluido IGV, y se desglosa en
 *    `baseImponible` + `importeIgv` con `COMISION_IGV_PORCENTAJE`
 *    (18.00 %) garantizando `baseImponible + importeIgv = importeTotal`.
 *    Es idempotente por `cierreId`.
 *  - S17: solo se revierte una comisión `PENDIENTE` dentro de la ventana
 *    `REVERSION_PLAZO_DIAS` (30 días). Si ya fue `LIQUIDADA`, se rechaza
 *    con 409 (exige movimiento inverso auditado). La comisión conserva
 *    su fila (`Estado = 'REVERTIDA'`) y el detalle queda en
 *    `dbo.ComisionReversiones`.
 */

export class ComisionNoConfiguradaError extends Error {
  constructor(clave: string) {
    super(`El parámetro ${clave} no está configurado o es inválido`);
    this.name = "ComisionNoConfiguradaError";
  }
}

export class ComisionEstadoNoPermitidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComisionEstadoNoPermitidoError";
  }
}

export class ComisionPlazoReversionVencidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComisionPlazoReversionVencidoError";
  }
}

const CLAVE_TASA = "COMISION_TASA_PORCENTAJE";
const CLAVE_IGV = "COMISION_IGV_PORCENTAJE";
const CLAVE_PLAZO_REVERSION = "REVERSION_PLAZO_DIAS";

const DIA_MS = 24 * 60 * 60 * 1000;

const ROLES_VEN_CARTERA_AJENA: string[] = [
  APP_ROLES.DIRECCION_COMERCIAL,
  APP_ROLES.ADMINISTRACION,
  APP_ROLES.GERENCIA_GENERAL,
];

function puedeVerCarteraAjena(user: AuthenticatedUser): boolean {
  const roles = (user?.roles || []).map((r) => r.toLowerCase());
  return ROLES_VEN_CARTERA_AJENA.some((rol) =>
    roles.includes(rol.toLowerCase()),
  );
}

function esVisible(freelanceId: string, user: AuthenticatedUser): boolean {
  if (puedeVerCarteraAjena(user)) {
    return true;
  }

  const prop = freelanceId?.toLowerCase();
  const oid = user?.oid?.toLowerCase();

  return Boolean(prop && oid && prop === oid);
}

function aEnteroPositivo(value: string | number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Desglosa la comisión total (incluido IGV) en base imponible e IGV
 * garantizando que `baseImponible + importeIgv === importeTotal`.
 *
 * Ejemplo APF2 (captación 200 000, tasa 3 %, IGV 18 %):
 *   importeTotal  = 6 000.00
 *   baseImponible = 5 084.75
 *   importeIgv    =   915.25
 */
export function desglosarComision(
  montoCaptado: number,
  tasaPorcentaje: number,
  porcentajeIgv: number,
): {
  importeTotal: number;
  baseImponible: number;
  importeIgv: number;
} {
  const importeTotal = redondear2(montoCaptado * (tasaPorcentaje / 100));
  const baseImponible = redondear2(importeTotal / (1 + porcentajeIgv / 100));
  const importeIgv = redondear2(importeTotal - baseImponible);

  return {
    importeTotal,
    baseImponible,
    importeIgv,
  };
}

function esRechazoComision(error: unknown): boolean {
  return (
    error instanceof ComisionEstadoNoPermitidoError ||
    error instanceof ComisionPlazoReversionVencidoError
  );
}

// ---------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------

export async function listarComisiones(
  user: AuthenticatedUser,
  filtros: ListarComisionesQuery,
) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;

  const freelanceId = puedeVerCarteraAjena(user)
    ? filtros.freelanceId
    : user.oid;

  const resultado = await repository.findComisiones({
    estado: filtros.estado,
    freelanceId,
    desde: filtros.desde,
    hasta: filtros.hasta,
    page,
    pageSize,
  });

  return {
    items: resultado.items,
    page,
    pageSize,
    total: resultado.total,
  };
}

export async function obtenerComision(
  comisionId: string | number,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(comisionId);
  if (id === null) return null;

  const comision = await repository.findComisionById(id);
  if (!comision) return null;

  return esVisible(comision.freelanceId, user) ? comision : null;
}

// ---------------------------------------------------------------------
// S16: Cálculo de comisión al consumir CierreGanadoRegistrado
// ---------------------------------------------------------------------

export async function calcularComisionParaCierreEnTx(
  ejecutor: Ejecutor,
  cierreId: number,
  correlationId: string | null = null,
): Promise<repository.Comision> {
  const [tasa, igv, cierre] = await Promise.all([
    configuracion.findParametroDecimal(CLAVE_TASA),
    configuracion.findParametroDecimal(CLAVE_IGV),
    cierresRepository.findCierreById(cierreId),
  ]);

  if (tasa === null || tasa <= 0 || tasa > 100) {
    throw new ComisionNoConfiguradaError(CLAVE_TASA);
  }

  if (igv === null || igv < 0 || igv > 100) {
    throw new ComisionNoConfiguradaError(CLAVE_IGV);
  }

  if (!cierre) {
    throw new Error(`El cierre ${cierreId} no existe para calcular su comisión`);
  }

  const desglose = desglosarComision(cierre.montoCaptado, tasa, igv);

  return repository.registrarComisionEnTx(
    ejecutor,
    {
      cierreId: cierre.cierreId,
      freelanceId: cierre.freelanceId,
      monedaCodigo: cierre.monedaCodigo,
      montoCaptado: cierre.montoCaptado,
      tasaPorcentaje: tasa,
      porcentajeIgv: igv,
      importeTotal: desglose.importeTotal,
      baseImponible: desglose.baseImponible,
      importeIgv: desglose.importeIgv,
      creadoId: cierre.registradoPorId,
      creadoNombre: cierre.registradoPorNombre,
    },
    correlationId,
  );
}

// ---------------------------------------------------------------------
// S17: Reversión de comisión pendiente
// ---------------------------------------------------------------------

async function revertirSinAuditoria(
  comisionId: string | number,
  input: RevertirComisionInput,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(comisionId);
  if (id === null) return null;

  const comision = await repository.findComisionById(id);
  if (!comision) return null;

  if (comision.estado === "LIQUIDADA") {
    throw new ComisionEstadoNoPermitidoError(
      "La comisión ya fue liquidada y no admite reversión directa; requiere movimiento inverso auditado",
    );
  }

  if (comision.estado === "REVERTIDA") {
    throw new ComisionEstadoNoPermitidoError(
      "La comisión ya se encuentra revertida",
    );
  }

  const plazoDias = await configuracion.findParametroEntero(
    CLAVE_PLAZO_REVERSION,
  );
  if (plazoDias === null || plazoDias <= 0) {
    throw new ComisionNoConfiguradaError(CLAVE_PLAZO_REVERSION);
  }

  const fechaCalculo = new Date(comision.fechaCalculoUtc);
  const diasTranscurridos = Math.floor(
    (input.fechaEvaluacionUtc.getTime() - fechaCalculo.getTime()) / DIA_MS,
  );

  if (diasTranscurridos > plazoDias) {
    throw new ComisionPlazoReversionVencidoError(
      `El plazo de reversión (${plazoDias} días) ha vencido`,
    );
  }

  const revertida = await repository.revertirComision({
    comisionId: comision.comisionId,
    motivoCodigo: input.motivoCodigo,
    motivoDetalle: input.motivoDetalle ?? null,
    estadoKyc: input.estadoKyc ?? null,
    estadoDesembolso: input.estadoDesembolso ?? null,
    fechaEvaluacionUtc: input.fechaEvaluacionUtc,
    observacion: input.observacion ?? null,
    usuarioId: user.oid,
    usuarioNombre: user?.name || "",
  });

  if (!revertida) {
    throw new ComisionEstadoNoPermitidoError(
      "La comisión cambió de estado durante la operación; vuelva a consultarla",
    );
  }

  return revertida;
}

export function revertir(
  comisionId: string | number,
  input: RevertirComisionInput,
  user: AuthenticatedUser,
) {
  return conAuditoriaDeRechazo(
    {
      servicioCodigo: "S17",
      operacion: "RevertirComision",
      entidad: "Comision",
      entidadId: comisionId,
    },
    esRechazoComision,
    () => revertirSinAuditoria(comisionId, input, user),
  );
}
