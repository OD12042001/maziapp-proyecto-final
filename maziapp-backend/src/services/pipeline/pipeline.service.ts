import * as repository from "../../repositories/pipeline/pipeline.repository";
import { Oportunidad } from "../../repositories/pipeline/pipeline.repository";
import { conAuditoriaDeRechazo } from "../auditoria/auditoria.service";
import * as contactoService from "../contactos/contacto.service";
import { APP_ROLES } from "../../config/roles";
import { AuthenticatedUser } from "../../types/authenticated-user";
import {
  AvanzarEtapaInput,
  CrearOportunidadInput,
  ListarOportunidadesQuery,
  PerderOportunidadInput,
} from "../../validators/pipeline.validator";

/**
 * Servicio de Pipeline (S06).
 *
 * Reglas de negocio que no se pueden expresar en Zod porque dependen de
 * datos ya persistidos:
 * - la etapa inicial sale del catálogo (primera activa por orden);
 * - el avance es secuencial sobre las etapas activas;
 * - entrar a la etapa de cierre exige KYC validado y cierre registrado,
 *   y deja la oportunidad en GANADA;
 * - el freelance solo ve su cartera; dirección y gerencia ven todo;
 * - anti-enumeración: lo no visible se devuelve como `null`, nunca 403.
 */

export class PipelineMonedaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineMonedaInvalidaError";
  }
}

export class PipelineSinEtapaInicialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineSinEtapaInicialError";
  }
}

export class PipelineOportunidadCerradaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineOportunidadCerradaError";
  }
}

export class PipelineEtapaNoSecuencialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineEtapaNoSecuencialError";
  }
}

export class PipelineCierreNoHabilitadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineCierreNoHabilitadoError";
  }
}

/**
 * Violación del estándar de concurrencia detectada por el repositorio
 * (`UPDATE` condicional con `rowsAffected = 0`). Se reexporta para que
 * los handlers dependan solo del servicio.
 */
export { PipelineConflictoConcurrenciaError } from "../../repositories/pipeline/pipeline.repository";

/** Reglas de negocio que impiden la operación (409): se auditan como RECHAZO. */
function esRechazoPipeline(error: unknown): boolean {
  return (
    error instanceof PipelineOportunidadCerradaError ||
    error instanceof PipelineEtapaNoSecuencialError ||
    error instanceof PipelineCierreNoHabilitadoError ||
    error instanceof repository.PipelineConflictoConcurrenciaError
  );
}

/**
 * Roles con visibilidad de cartera ajena, tal como los declara el
 * contrato aprobado (`GET /pipeline/oportunidades`): Dirección Comercial
 * y Gerencia General ven todas las oportunidades.
 */
const ROLES_VEN_CARTERA_AJENA: string[] = [
  APP_ROLES.DIRECCION_COMERCIAL,
  APP_ROLES.GERENCIA_GENERAL,
];

function puedeVerCarteraAjena(user: AuthenticatedUser): boolean {
  const roles = (user?.roles || []).map((rol) => rol.toLowerCase());

  return ROLES_VEN_CARTERA_AJENA.some((rol) => roles.includes(rol.toLowerCase()));
}

function esVisible(
  oportunidad: { responsableId: string },
  user: AuthenticatedUser,
): boolean {
  if (puedeVerCarteraAjena(user)) {
    return true;
  }

  // Los `uniqueidentifier` llegan de SQL Server en mayúsculas y el claim
  // `oid` en minúsculas: es el mismo GUID, se normaliza antes de
  // comparar (misma corrección que contacto.service.ts, Fase 3.13).
  const responsableId = oportunidad.responsableId?.toLowerCase();
  const usuarioOid = user?.oid?.toLowerCase();

  if (!responsableId || !usuarioOid) {
    return false;
  }

  return responsableId === usuarioOid;
}

function aEnteroPositivo(value: string | number): number | null {
  const n = Number(value);

  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
}

// ---------------------------------------------------------------------
// Catálogo de etapas
// ---------------------------------------------------------------------

export async function listarEtapas() {
  return repository.findAllEtapas();
}

// ---------------------------------------------------------------------
// Oportunidades
// ---------------------------------------------------------------------

export async function listarOportunidades(
  user: AuthenticatedUser,
  filtros: ListarOportunidadesQuery,
) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;

  // El rol sin visibilidad de cartera ajena queda forzado a su propio
  // `oid`: el `responsableId` de la query nunca puede ampliar su alcance.
  const responsableId = puedeVerCarteraAjena(user)
    ? filtros.responsableId
    : user.oid;

  const resultado = await repository.findOportunidades({
    estado: filtros.estado,
    etapaCodigo: filtros.etapaCodigo,
    contactoId: filtros.contactoId,
    responsableId,
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

export async function obtenerOportunidad(
  oportunidadId: string | number,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(oportunidadId);

  if (id === null) {
    return null;
  }

  const oportunidad = await repository.findOportunidadById(id);

  if (!oportunidad) {
    return null;
  }

  return esVisible(oportunidad, user) ? oportunidad : null;
}

export async function crearOportunidad(
  input: CrearOportunidadInput,
  user: AuthenticatedUser,
  correlationId: string | null,
) {
  // Reutiliza la comprobación de ownership de Contactos: si el contacto
  // no existe o no es del usuario, no se crea nada (anti-enumeración).
  const contacto = await contactoService.obtenerContactoPorId(
    String(input.contactoId),
    user,
  );

  if (!contacto) {
    return null;
  }

  const etapas = await repository.findEtapasActivas();
  const etapaInicial = [...etapas].sort((a, b) => a.orden - b.orden)[0];

  if (!etapaInicial) {
    throw new PipelineSinEtapaInicialError(
      "El catálogo de etapas no tiene ninguna etapa activa",
    );
  }

  if (input.montoEstimado !== undefined && !input.monedaCodigo) {
    throw new PipelineMonedaInvalidaError(
      "monedaCodigo es obligatoria cuando se informa montoEstimado",
    );
  }

  if (input.monedaCodigo) {
    const moneda = await repository.findMonedaActiva(input.monedaCodigo);

    if (!moneda) {
      throw new PipelineMonedaInvalidaError(
        `La moneda ${input.monedaCodigo} no existe o está inactiva`,
      );
    }
  }

  return repository.saveOportunidad(
    {
      contactoId: input.contactoId,
      responsableId: user.oid,
      etapaId: etapaInicial.etapaId,
      montoEstimado: input.montoEstimado ?? null,
      monedaCodigo: input.monedaCodigo ?? null,
      creadoId: user.oid,
      creadoNombre: user?.name || "",
    },
    { correlationId },
  );
}

export async function avanzarEtapa(
  oportunidadId: string | number,
  input: AvanzarEtapaInput,
  user: AuthenticatedUser,
  correlationId: string | null,
) {
  const oportunidad = await obtenerOportunidad(oportunidadId, user);

  if (!oportunidad) {
    return null;
  }

  return conAuditoriaDeRechazo(
    {
      servicioCodigo: "S06",
      operacion: "AvanzarEtapa",
      entidad: "Oportunidad",
      entidadId: oportunidad.oportunidadId,
    },
    esRechazoPipeline,
    () => avanzarEtapaValidada(oportunidad, input, user, correlationId),
  );
}

async function avanzarEtapaValidada(
  oportunidad: Oportunidad,
  input: AvanzarEtapaInput,
  user: AuthenticatedUser,
  correlationId: string | null,
) {
  if (oportunidad.estado !== "ACTIVA") {
    throw new PipelineOportunidadCerradaError(
      "La oportunidad ya está cerrada y no admite cambios de etapa",
    );
  }

  const etapas = [...(await repository.findEtapasActivas())].sort(
    (a, b) => a.orden - b.orden,
  );

  const indiceActual = etapas.findIndex(
    (etapa) => etapa.etapaId === oportunidad.etapa.etapaId,
  );
  const indiceDestino = etapas.findIndex(
    (etapa) => etapa.codigo === input.etapaDestinoCodigo,
  );

  if (indiceDestino < 0) {
    throw new PipelineEtapaNoSecuencialError(
      `La etapa ${input.etapaDestinoCodigo} no existe o está inactiva`,
    );
  }

  if (indiceActual < 0 || indiceDestino !== indiceActual + 1) {
    throw new PipelineEtapaNoSecuencialError(
      "El avance debe ser a la etapa inmediatamente siguiente del catálogo",
    );
  }

  const destino = etapas[indiceDestino];

  let estado = "ACTIVA";
  let fechaResultado: Date | null = null;

  if (destino.permiteCierre) {
    const [kycValidado, cierreRegistrado] = await Promise.all([
      repository.existeKycValidado(oportunidad.oportunidadId),
      repository.existeCierreRegistrado(oportunidad.oportunidadId),
    ]);

    if (!kycValidado) {
      throw new PipelineCierreNoHabilitadoError(
        "No se puede cerrar la oportunidad: el expediente KYC no está validado",
      );
    }

    if (!cierreRegistrado) {
      throw new PipelineCierreNoHabilitadoError(
        "No se puede cerrar la oportunidad: no hay un cierre de inversión registrado",
      );
    }

    estado = "GANADA";
    fechaResultado = new Date();
  }

  return repository.actualizarEtapa(
    oportunidad.oportunidadId,
    destino.etapaId,
    oportunidad.etapa.etapaId,
    {
      usuarioId: user.oid,
      usuarioNombre: user?.name || "",
      observacion: input.observacion ?? null,
      correlationId,
      estado,
      fechaResultado,
    },
  );
}

export async function marcarPerdida(
  oportunidadId: string | number,
  input: PerderOportunidadInput,
  user: AuthenticatedUser,
) {
  const oportunidad = await obtenerOportunidad(oportunidadId, user);

  if (!oportunidad) {
    return null;
  }

  return conAuditoriaDeRechazo(
    {
      servicioCodigo: "S06",
      operacion: "PerderOportunidad",
      entidad: "Oportunidad",
      entidadId: oportunidad.oportunidadId,
    },
    esRechazoPipeline,
    async () => {
      if (oportunidad.estado !== "ACTIVA") {
        throw new PipelineOportunidadCerradaError(
          "La oportunidad ya está cerrada y no admite cambios de estado",
        );
      }

      return repository.marcarPerdida(oportunidad.oportunidadId, input.motivo, {
        usuarioId: user.oid,
        usuarioNombre: user?.name || "",
      });
    },
  );
}

export async function obtenerHistorial(
  oportunidadId: string | number,
  user: AuthenticatedUser,
) {
  const oportunidad = await obtenerOportunidad(oportunidadId, user);

  if (!oportunidad) {
    return null;
  }

  return repository.findHistorialByOportunidad(oportunidad.oportunidadId);
}
