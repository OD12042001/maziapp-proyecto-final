import * as repository from "../../repositories/direcciones/direccion.repository";
import * as ubigeoRepository from "../../repositories/ubigeo/ubigeo.repository";
import * as contactoService from "../contactos/contacto.service";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { DireccionInput } from "../../validators/direccion.validator";

/**
 * Fase Direcciones -- reglas de negocio de Direcciones de un Contacto.
 */

// 🔐 Error de negocio: el IdDistrito enviado no existe (o está
// inactivo, junto con su Provincia/Departamento) en dbo.Distritos. Se
// distingue deliberadamente de "no encontrado/no autorizado" del
// propio Contacto -- el Function lo traduce a 400, nunca a 404.
export class DireccionDistritoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DireccionDistritoInvalidoError";
  }
}

// 🔐 Resuelve "el Contacto existe y pertenece al usuario autenticado",
// reutilizando SIN MODIFICAR obtenerContactoPorId de
// contacto.service.ts (misma comparación de ownership
// case-insensitive de la Fase 3.13). A diferencia de
// resolverEmpresaJuridica() en representante.service.ts, esta función
// NO exige TipoContacto = 'JURIDICA': Direcciones aplica tanto a
// NATURAL como a JURIDICA (decisión confirmada de esta fase). Nunca se
// confía en que el Frontend ya validó el ownership -- esta
// verificación ocurre siempre en el Backend, para cualquier llamada
// (GET/POST/PATCH/DELETE).
async function resolverContactoAccesible(contactoId: string, user: AuthenticatedUser) {
  return contactoService.obtenerContactoPorId(contactoId, user);
}

// 🔍 Verifica que IdDistrito exista y esté activo (con toda su cadena
// Provincia/Departamento también activa) antes de crear/actualizar una
// Dirección -- Zod ya garantizó que es un entero positivo, pero no
// puede garantizar que exista en base de datos.
async function validarDistrito(idDistrito: number) {
  const distrito = await ubigeoRepository.findDistritoById(idDistrito);

  if (!distrito) {
    throw new DireccionDistritoInvalidoError("El distrito seleccionado no es válido.");
  }

  return distrito;
}

// 📋 LISTAR direcciones activas de un contacto.
export async function listarDirecciones(contactoId: string, user: AuthenticatedUser) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  return repository.findDireccionesByContacto(contacto.pid);
}

// ➕ CREAR una Dirección para un contacto (NATURAL o JURIDICA, sin
// límite de una sola dirección por contacto).
export async function crearDireccion(
  contactoId: string,
  input: DireccionInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  await validarDistrito(input.idDistrito);

  const idDireccion = await repository.saveDireccion({
    idContacto: contacto.pid,
    idDistrito: input.idDistrito,
    calle: input.calle,
    numero: input.numero,
    departamentoInterior: input.departamentoInterior ?? null,
  });

  // 📌 Se re-lee la fila recién creada con su JOIN de ubigeo (mismo
  // criterio que crearRepresentante: la respuesta refleja exactamente
  // lo que quedó persistido, incluyendo Distrito/Provincia/
  // Departamento resueltos por JOIN, nunca reconstruidos a mano).
  return repository.findDireccionByIdYContacto(idDireccion, contacto.pid);
}

// ✏️ ACTUALIZAR una Dirección existente. Endpoint independiente de
// crearDireccion (no se reutiliza para actualizar, mismo criterio que
// updateContacto.ts frente a createContacto.ts).
export async function actualizarDireccion(
  contactoId: string,
  direccionId: string,
  input: DireccionInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  const idDireccionNumerico = Number(direccionId);

  if (!Number.isInteger(idDireccionNumerico)) {
    return null;
  }

  await validarDistrito(input.idDistrito);

  const actualizado = await repository.updateDireccion(idDireccionNumerico, contacto.pid, {
    idDistrito: input.idDistrito,
    calle: input.calle,
    numero: input.numero,
    departamentoInterior: input.departamentoInterior ?? null,
  });

  if (!actualizado) {
    // No existía, no era de este contacto, o ya estaba desactivada --
    // mismo `null` -> 404 en la capa de Function (anti-enumeración).
    return null;
  }

  return repository.findDireccionByIdYContacto(idDireccionNumerico, contacto.pid);
}

// ➖ DESACTIVAR (soft delete) una Dirección. Nunca borra la fila
// físicamente (decisión de esta fase: igual que
// dbo.ContactoRepresentante).
export async function desactivarDireccion(
  contactoId: string,
  direccionId: string,
  user: AuthenticatedUser,
) {
  const contacto = await resolverContactoAccesible(contactoId, user);

  if (!contacto) {
    return null;
  }

  const idDireccionNumerico = Number(direccionId);

  if (!Number.isInteger(idDireccionNumerico)) {
    return null;
  }

  const desactivada = await repository.desactivarDireccion(idDireccionNumerico, contacto.pid);

  if (!desactivada) {
    // No existía, no era de este contacto, o ya estaba desactivada --
    // mismo `null` -> 404 en la capa de Function.
    return null;
  }

  return true;
}
