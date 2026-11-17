import * as repository from "../../repositories/contactos/contactoActividad.repository";
import * as ciiuRepository from "../../repositories/ciiu/ciiu.repository";
import * as contactoService from "./contacto.service";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { ActividadNaturalInput, ActividadJuridicaInput } from "../../validators/contactoActividad.validator";

/**
 * Fase Actividad -- reglas de negocio de la pestaña "Actividad" de la
 * Ficha Contacto (Grado de instrucción/Profesión para NATURAL; CIIU
 * para JURIDICA).
 *
 * IMPORTANTE -- distinto de dbo.Actividades (bitácora de interacciones
 * comerciales, schema_v2_Contactos_propuesto.sql). Este service no lo
 * toca ni lo reutiliza.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): este service YA NO tiene ninguna
 * responsabilidad sobre Trabajos Dependientes -- ni lectura (ver
 * `obtenerActividad`, que dejó de incluir `trabajos` en su respuesta)
 * ni escritura (ver `guardarActividadNatural`, que ya no recibe
 * `trabajosNuevos` ni valida `empresaContactoId`). Esa responsabilidad
 * es ahora exclusiva de `trabajoDependiente.service.ts` (Etapa 2) --
 * por eso `ActividadEmpresaInvalidaError` (la clase de error que
 * existía únicamente para esa validación) fue eliminada de este
 * archivo; el equivalente independiente es
 * `TrabajoDependienteEmpresaInvalidaError` en
 * `trabajoDependiente.service.ts`, nunca reutilizado desde aquí.
 */

// 🔐 El TipoContacto real de la fila (leído por resolverContactoAccesible,
// nunca del body) no coincide con la rama que este service intenta
// guardar -- red de seguridad adicional: en el flujo normal, el
// Function ya decidió qué schema Zod aplicar consultando el mismo dato
// (ver updateContactoActividad.ts), así que este error no debería
// dispararse en uso real; existe para no confiar ciegamente en esa
// única verificación (mismo principio de defensa en profundidad del
// resto del módulo).
export class ActividadTipoIncorrectoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActividadTipoIncorrectoError";
  }
}

// 🔐 El `ciiuId` enviado no existe (o está inactivo) en
// dbo.CatalogoCiiu -- se distingue de "no encontrado/no autorizado"
// del propio Contacto; el Function lo traduce a 400, nunca a 404.
export class ActividadCiiuInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActividadCiiuInvalidoError";
  }
}

// 🔐 Resuelve "el Contacto existe y pertenece al usuario autenticado",
// reutilizando SIN MODIFICAR obtenerContactoPorId de
// contacto.service.ts -- misma comparación de ownership
// case-insensitive de la Fase 3.13, mismo criterio anti-enumeración
// (404, nunca 403) que el resto del módulo. Nunca se confía en que el
// Frontend ya validó el ownership.
async function resolverContactoAccesible(contactoId: string, user: AuthenticatedUser) {
  return contactoService.obtenerContactoPorId(contactoId, user);
}

function datosActor(user: AuthenticatedUser) {
  return {
    id: user.oid,
    nombre: user?.name || "",
    correo: user?.preferred_username || "",
  };
}

// 🔍 OBTENER -- Actividad de un contacto (para precargar la pestaña al
// abrir la Ficha).
//
// 🔐 ETAPA 3: ya NO consulta ni devuelve Trabajos dependientes --
// antes incluía `trabajos` (vacío para JURIDICA, consultado vía
// `repository.findTrabajosByContacto` para NATURAL). La nueva fuente
// de verdad es GET /api/contactos/{contactoId}/trabajos-dependientes
// (trabajoDependiente.service.ts::listarTrabajosDependientes) -- no
// mantener dos fuentes de lectura del mismo dato en dos respuestas
// distintas.
export async function obtenerActividad(contactoId: string, user: AuthenticatedUser) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  const actividad = await repository.findActividadByContacto(contacto.pid);

  return { tipoContacto: contacto.tipoContacto, actividad };
}

// 💾 GUARDAR -- rama NATURAL (Grado de instrucción + Profesión).
//
// 🔐 ETAPA 3: ya NO recibe ni procesa `trabajosNuevos` -- antes
// validaba cada `empresaContactoId` (vía
// `empresaBusquedaRepository.existeEmpresaAccesible`) y pasaba los
// trabajos nuevos a `repository.guardarActividadConTrabajos` para
// insertarlos en la misma transacción. Esa responsabilidad completa
// (validación de empresa + inserción de trabajos) se retiró de este
// service -- Trabajos Dependientes ahora se crea/edita/desactiva
// exclusivamente vía sus propios endpoints
// (POST/PATCH/DELETE /api/contactos/{contactoId}/trabajos-dependientes[/{trabajoId}],
// Etapa 2). "Guardar" de Actividad ahora persiste ÚNICAMENTE
// GradoInstruccion + ProfesionOcupacion.
export async function guardarActividadNatural(
  contactoId: string,
  input: ActividadNaturalInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  if (contacto.tipoContacto !== "NATURAL") {
    throw new ActividadTipoIncorrectoError(
      "Grado de instrucción/Profesión no son válidos para un contacto de tipo JURIDICA",
    );
  }

  const { actividad } = await repository.guardarActividadConTrabajos(
    contacto.pid,
    {
      gradoInstruccion: input.gradoInstruccion,
      profesionOcupacion: input.profesionOcupacion,
    },
    null,
    datosActor(user),
  );

  return { tipoContacto: contacto.tipoContacto, actividad };
}

// 💾 GUARDAR -- rama JURIDICA (CIIU únicamente). Misma transacción del
// repository.
export async function guardarActividadJuridica(
  contactoId: string,
  input: ActividadJuridicaInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  if (contacto.tipoContacto !== "JURIDICA") {
    throw new ActividadTipoIncorrectoError("CIIU no es válido para un contacto de tipo NATURAL");
  }

  const ciiu = await ciiuRepository.findCiiuById(input.ciiuId);

  if (!ciiu) {
    throw new ActividadCiiuInvalidoError("El CIIU seleccionado no es válido.");
  }

  const { actividad } = await repository.guardarActividadConTrabajos(
    contacto.pid,
    null,
    { ciiuId: input.ciiuId },
    datosActor(user),
  );

  return { tipoContacto: contacto.tipoContacto, actividad };
}
