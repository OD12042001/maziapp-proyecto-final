import * as repository from "../../repositories/trabajosDependientes/trabajoDependiente.repository";
import * as empresaBusquedaRepository from "../../repositories/contactos/empresaBusqueda.repository";
import * as contactoService from "../contactos/contacto.service";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { TrabajoDependienteInput } from "../../validators/trabajoDependiente.validator";

/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- reglas de negocio de los Trabajos dependientes de un
 * Contacto NATURAL.
 *
 * INDEPENDIENTE de contactoActividad.service.ts (que sigue existiendo,
 * sin modificar, para el flujo actual de "Guardar" de Actividad -- ver
 * Etapa 2: este archivo no reemplaza a ese, coexisten hasta que una
 * etapa posterior retire `trabajosNuevos` de ese flujo).
 */

// 🔐 Un Trabajo dependiente solo tiene sentido para un Contacto de
// tipo NATURAL (mismo criterio de negocio que
// contactoActividad.service.ts::ActividadTipoIncorrectoError, y que el
// propio comentario de dbo.ContactoTrabajoDependiente en
// schema_v7_ActividadContacto_propuesto.sql: "solo aplica a personas
// NATURAL"). El Function lo traduce a 400, nunca a 404.
export class TrabajoDependienteTipoIncorrectoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrabajoDependienteTipoIncorrectoError";
  }
}

// 🔐 El `empresaContactoId` enviado no es, en este momento, un
// Contacto JURIDICA ACTIVO dentro de la cartera del usuario
// autenticado -- ver
// empresaBusqueda.repository.ts::existeEmpresaAccesible. Reubicado
// desde contactoActividad.service.ts::ActividadEmpresaInvalidaError
// (instrucción explícita de la Etapa 2: "la validación de
// empresaContactoId que actualmente pertenece a
// contactoActividad.service.ts debe trasladarse al nuevo
// trabajoDependiente.service.ts, porque ahora Trabajo Dependiente
// tendrá responsabilidad propia") -- clase LOCAL a este módulo, mismo
// criterio de independencia que DireccionDistritoInvalidoError en
// direccion.service.ts (nunca se importa/reutiliza la clase de
// contactoActividad.service.ts). El Function lo traduce a 400, nunca a
// 404 (evita confirmar si el id corresponde a un contacto real de
// otro usuario -- mismo criterio anti-enumeración que el resto del
// módulo).
export class TrabajoDependienteEmpresaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrabajoDependienteEmpresaInvalidaError";
  }
}

// 🔐 Resuelve "el Contacto existe y pertenece al usuario autenticado",
// reutilizando SIN MODIFICAR obtenerContactoPorId de
// contacto.service.ts (misma comparación de ownership
// case-insensitive de la Fase 3.13). Nunca se confía en que el
// Frontend ya validó el ownership -- esta verificación ocurre siempre
// en el Backend, para cualquier llamada (GET/POST/PATCH/DELETE).
async function resolverContactoAccesible(contactoId: string, user: AuthenticatedUser) {
  return contactoService.obtenerContactoPorId(contactoId, user);
}

function datosActor(user: AuthenticatedUser) {
  return {
    id: user.oid,
    nombre: user?.name || "",
  };
}

// 🔍 Verifica que `empresaContactoId`, cuando viene presente, sea un
// Contacto JURIDICA ACTIVO de la cartera del usuario autenticado --
// mismo chequeo que hacía contactoActividad.service.ts dentro de su
// loop sobre `trabajosNuevos`, adaptado aquí a un único trabajo (POST/
// PATCH de este módulo operan sobre un solo Trabajo dependiente a la
// vez, nunca un arreglo).
async function validarEmpresa(empresaContactoId: number | undefined, user: AuthenticatedUser) {
  if (empresaContactoId === undefined) {
    return;
  }

  const empresaValida = await empresaBusquedaRepository.existeEmpresaAccesible(
    empresaContactoId,
    user.oid,
  );

  if (!empresaValida) {
    throw new TrabajoDependienteEmpresaInvalidaError("La empresa seleccionada no es válida.");
  }
}

// 📋 LISTAR Trabajos dependientes activos de un contacto.
export async function listarTrabajosDependientes(contactoId: string, user: AuthenticatedUser) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  return repository.findTrabajosByContacto(contacto.pid);
}

// ➕ CREAR un Trabajo dependiente para un contacto NATURAL.
export async function crearTrabajoDependiente(
  contactoId: string,
  input: TrabajoDependienteInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  if (contacto.tipoContacto !== "NATURAL") {
    throw new TrabajoDependienteTipoIncorrectoError(
      "Trabajos dependientes no son válidos para un contacto de tipo JURIDICA",
    );
  }

  await validarEmpresa(input.empresaContactoId, user);

  const actor = datosActor(user);

  const id = await repository.saveTrabajoDependiente({
    contactoId: contacto.pid,
    empresaContactoId: input.empresaContactoId ?? null,
    empresaNombreLibre: input.empresaNombreLibre ?? null,
    cargo: input.cargo,
    desde: input.desde,
    hasta: input.hasta ?? null,
    creadoNombre: actor.nombre,
    creadoId: actor.id,
  });

  // 📌 Se re-lee la fila recién creada con su JOIN de Empresa (mismo
  // criterio que crearDireccion: la respuesta refleja exactamente lo
  // que quedó persistido).
  return repository.findTrabajoByIdYContacto(id, contacto.pid);
}

// ✏️ ACTUALIZAR un Trabajo dependiente existente. Endpoint
// independiente de crearTrabajoDependiente (no se reutiliza para
// actualizar, mismo criterio que actualizarDireccion frente a
// crearDireccion en direccion.service.ts).
export async function actualizarTrabajoDependiente(
  contactoId: string,
  trabajoId: string,
  input: TrabajoDependienteInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  const idNumerico = Number(trabajoId);

  if (!Number.isInteger(idNumerico)) {
    return null;
  }

  await validarEmpresa(input.empresaContactoId, user);

  const actualizado = await repository.updateTrabajoDependiente(idNumerico, contacto.pid, {
    empresaContactoId: input.empresaContactoId ?? null,
    empresaNombreLibre: input.empresaNombreLibre ?? null,
    cargo: input.cargo,
    desde: input.desde,
    hasta: input.hasta ?? null,
  });

  if (!actualizado) {
    // No existía, no era de este contacto, o ya estaba desactivado --
    // mismo `null` -> 404 en la capa de Function (anti-enumeración).
    return null;
  }

  return repository.findTrabajoByIdYContacto(idNumerico, contacto.pid);
}

// ➖ DESACTIVAR (soft delete) un Trabajo dependiente. Nunca borra la
// fila físicamente (decisión de esta fase, igual que Direcciones).
export async function desactivarTrabajoDependiente(
  contactoId: string,
  trabajoId: string,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  const idNumerico = Number(trabajoId);

  if (!Number.isInteger(idNumerico)) {
    return null;
  }

  const desactivado = await repository.desactivarTrabajoDependiente(idNumerico, contacto.pid);

  if (!desactivado) {
    // No existía, no era de este contacto, o ya estaba desactivado --
    // mismo `null` -> 404 en la capa de Function.
    return null;
  }

  return true;
}
