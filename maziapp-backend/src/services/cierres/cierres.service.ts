import { APP_ROLES } from "../../config/roles";
import * as repository from "../../repositories/cierres/cierres.repository";
import { CierreDuplicadoError } from "../../repositories/cierres/cierres.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";
import {
  ListarCierresQuery,
  RegistrarCierreInput,
} from "../../validators/cierres.validator";
import { conAuditoriaDeRechazo } from "../auditoria/auditoria.service";

/**
 * Servicio de Cierres de inversión (S15).
 *
 * Precondiciones de negocio:
 *  - la oportunidad existe y pertenece a la cartera del usuario (si no,
 *    devuelve `null` → 404 uniforme, anti-enumeración);
 *  - la oportunidad no está PERDIDA;
 *  - el expediente KYC de la oportunidad está VALIDADO;
 *  - no existe ya un cierre para la oportunidad (`UNIQUE`);
 *  - el proyecto y la moneda existen y están activos.
 *
 * El cierre publica `CierreGanadoRegistrado` en el outbox en la misma
 * transacción; el cálculo de la comisión (S16) ocurre al consumir ese
 * evento en el ESB lógico.
 */

export { CierreDuplicadoError } from "../../repositories/cierres/cierres.repository";

export class CierreOportunidadNoValidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CierreOportunidadNoValidaError";
  }
}

export class CierreKycNoValidadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CierreKycNoValidadoError";
  }
}

export class CierreProyectoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CierreProyectoInvalidoError";
  }
}

export class CierreMonedaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CierreMonedaInvalidaError";
  }
}

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

function esVisible(propietarioOid: string, user: AuthenticatedUser): boolean {
  if (puedeVerCarteraAjena(user)) {
    return true;
  }

  const prop = propietarioOid?.toLowerCase();
  const oid = user?.oid?.toLowerCase();

  return Boolean(prop && oid && prop === oid);
}

function aEnteroPositivo(value: string | number): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function esRechazoCierre(error: unknown): boolean {
  return (
    error instanceof CierreDuplicadoError ||
    error instanceof CierreOportunidadNoValidaError ||
    error instanceof CierreKycNoValidadoError ||
    error instanceof CierreProyectoInvalidoError ||
    error instanceof CierreMonedaInvalidaError
  );
}

export async function listarCierres(
  user: AuthenticatedUser,
  filtros: ListarCierresQuery,
) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;

  const freelanceId = puedeVerCarteraAjena(user)
    ? filtros.freelanceId
    : user.oid;

  const resultado = await repository.findCierres({
    proyectoId: filtros.proyectoId,
    freelanceId,
    estado: filtros.estado,
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

export async function obtenerCierre(
  cierreId: string | number,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(cierreId);
  if (id === null) return null;

  const cierre = await repository.findCierreById(id);
  if (!cierre) return null;

  return esVisible(cierre.freelanceId, user) ? cierre : null;
}

async function registrarCierreSinAuditoria(
  input: RegistrarCierreInput,
  user: AuthenticatedUser,
) {
  const oportunidad = await repository.findOportunidadParaCierre(
    input.oportunidadId,
  );

  if (!oportunidad || !esVisible(oportunidad.responsableId, user)) {
    return null;
  }

  if (oportunidad.estado === "PERDIDA") {
    throw new CierreOportunidadNoValidaError(
      "No se puede registrar un cierre sobre una oportunidad perdida",
    );
  }

  if (oportunidad.kycEstado !== "VALIDADO") {
    throw new CierreKycNoValidadoError(
      "No se puede registrar el cierre: el expediente KYC no está validado",
    );
  }

  const existente = await repository.findCierreByOportunidad(
    oportunidad.oportunidadId,
  );
  if (existente) {
    throw new CierreDuplicadoError(
      "La oportunidad ya tiene un cierre de inversión registrado",
    );
  }

  const proyecto = await repository.findProyectoById(input.proyectoId);
  if (!proyecto || !proyecto.activo) {
    throw new CierreProyectoInvalidoError(
      "El proyecto indicado no existe o está inactivo",
    );
  }

  const monedaActiva = await repository.findMonedaActiva(input.monedaCodigo);
  if (!monedaActiva) {
    throw new CierreMonedaInvalidaError(
      `La moneda ${input.monedaCodigo} no existe o está inactiva`,
    );
  }

  return repository.saveCierre({
    oportunidadId: oportunidad.oportunidadId,
    proyectoId: proyecto.proyectoId,
    montoCaptado: input.montoCaptado,
    monedaCodigo: input.monedaCodigo,
    fechaCierreUtc: input.fechaCierreUtc,
    freelanceId: oportunidad.responsableId,
    registradoPorId: user.oid,
    registradoPorNombre: user?.name || "",
  });
}

export function registrarCierre(
  input: RegistrarCierreInput,
  user: AuthenticatedUser,
) {
  return conAuditoriaDeRechazo(
    {
      servicioCodigo: "S15",
      operacion: "RegistrarCierre",
      entidad: "Oportunidad",
      entidadId: input.oportunidadId,
    },
    esRechazoCierre,
    () => registrarCierreSinAuditoria(input, user),
  );
}
