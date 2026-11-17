import * as repository from "../../repositories/representantes/representante.repository";
import * as contactoService from "../contactos/contacto.service";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { RepresentanteCreateInput, RepresentanteUpdateInput } from "../../validators/representante.validator";

/**
 * Fase Representantes -- reglas de negocio de Representantes de
 * Persona Juridica.
 */

// 🔐 Error de negocio: el Contacto existe y ES del usuario autenticado,
// pero no es JURIDICA. Se distingue deliberadamente de "no encontrado/
// no autorizado" (que sigue devolviendo `null`, 404, anti-enumeracion,
// exactamente igual que contacto.service.ts): revelar "tu propio
// contacto no es una empresa" no es una fuga de ownership -- el dueño
// ya conoce el tipo de su propio contacto. El Function lo traduce a
// 400, nunca a 403 ni 404.
export class RepresentanteContactoNoJuridicaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepresentanteContactoNoJuridicaError";
  }
}

// 🔐 Error de negocio: ya existe una relacion ACTIVA entre este
// Contacto y este Representante. El Function lo traduce a 409.
export class RepresentanteRelacionDuplicadaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepresentanteRelacionDuplicadaError";
  }
}

// 🔐 Orden exacto exigido (Fase Representantes, punto "ownership"):
//   1. el Contacto existe y pertenece al usuario autenticado --
//      reutiliza `obtenerContactoPorId` de contacto.service.ts, LA
//      MISMA comparacion de ownership case-insensitive de la Fase
//      3.13, sin reimplementarla aqui;
//   2. recien despues, si lo anterior paso, se verifica que el
//      Contacto es JURIDICA.
// Nunca se confia en que el Frontend ya oculto la pestaña
// Representantes para NATURAL -- esta verificacion ocurre siempre en
// el Backend, para cualquier llamada (GET/POST/PATCH/DELETE).
async function resolverEmpresaJuridica(contactoId: string, user: AuthenticatedUser) {
  const contacto = await contactoService.obtenerContactoPorId(contactoId, user);

  if (!contacto) {
    return null;
  }

  if (contacto.tipoContacto !== "JURIDICA") {
    throw new RepresentanteContactoNoJuridicaError(
      "El contacto no es una persona jurídica: no admite representantes.",
    );
  }

  return contacto;
}

// 📋 LISTAR representantes activos de una empresa.
export async function listarRepresentantes(contactoId: string, user: AuthenticatedUser) {
  const contacto = await resolverEmpresaJuridica(contactoId, user);

  if (!contacto) {
    return null;
  }

  return repository.findRepresentantesByContacto(contacto.pid);
}

// ➕ CREAR (o reutilizar) representante + relacion con la empresa.
//
// Flujo (Fase Representantes, punto "flujo"):
//   1. Contacto existe + es del usuario + es JURIDICA (si no: null o
//      throw, segun corresponda -- ver resolverEmpresaJuridica).
//   2. Buscar Representante por (TipoDocumento, NumeroDocumento):
//        - existe -> se REUTILIZA su RepresentanteId, SIN sobrescribir
//          Nombres/Apellidos/Celular/Correo (decision 5: esos datos
//          son del registro global de la persona, no de esta alta).
//        - no existe -> se crea.
//   3. Buscar relacion Contacto+Representante:
//        - activa -> RepresentanteRelacionDuplicadaError (409).
//        - inactiva (desactivada antes) -> se REACTIVA (Activo 0 -> 1),
//          actualizando Cargo por si cambio.
//        - no existe -> se crea la relacion.
export async function crearRepresentante(
  contactoId: string,
  input: RepresentanteCreateInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverEmpresaJuridica(contactoId, user);

  if (!contacto) {
    return null;
  }

  let representante = await repository.findRepresentanteByDocumento(
    input.tipoDocumento,
    input.numeroDocumento,
  );

  if (!representante) {
    representante = await repository.saveRepresentante({
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      nombres: input.nombres,
      apellidos: input.apellidos,
      celular: input.celular ?? null,
      correo: input.correo ?? null,
      creadoNombre: user?.name || "",
      creadoCorreo: user?.preferred_username || "",
      creadoId: user.oid,
    });
  }

  const representanteIdNumerico = Number(representante.representanteId);
  const relacion = await repository.findRelacion(contacto.pid, representanteIdNumerico);

  if (relacion?.activo) {
    throw new RepresentanteRelacionDuplicadaError(
      "Este representante ya está registrado como representante de esta empresa.",
    );
  }

  let contactoRepresentanteId: number;

  if (relacion) {
    // Relación existía pero estaba desactivada -> reactivar (nunca
    // crear una segunda fila para la misma pareja).
    await repository.reactivarRelacion(relacion.contactoRepresentanteId, input.cargo, user.oid);
    contactoRepresentanteId = relacion.contactoRepresentanteId;
  } else {
    contactoRepresentanteId = await repository.saveRelacion({
      contactoId: contacto.pid,
      representanteId: representanteIdNumerico,
      cargo: input.cargo,
      creadoId: user.oid,
    });
  }

  // 📌 Los datos personales devueltos (nombres/apellidos/celular/
  // correo) SIEMPRE vienen del registro de `representante` resuelto
  // arriba (nuevo o reutilizado) -- nunca del `input` de esta llamada
  // en particular, para que la respuesta refleje exactamente lo que
  // quedó persistido (decisión 5: no sobrescribir datos personales al
  // reutilizar).
  return {
    contactoRepresentanteId: String(contactoRepresentanteId),
    representanteId: representante.representanteId,
    tipoDocumento: representante.tipoDocumento,
    numeroDocumento: representante.numeroDocumento,
    nombres: representante.nombres,
    apellidos: representante.apellidos,
    cargo: input.cargo,
    celular: representante.celular,
    correo: representante.correo,
  };
}

// ✏️ ACTUALIZAR (edición) los datos de un representante ya asociado a
// una empresa -- PATCH /api/contactos/{contactoId}/representantes/{representanteId}
// (endpoint nuevo, independiente de crearRepresentante, mismo criterio
// que direccion.service.ts::actualizarDireccion frente a
// direccion.service.ts::crearDireccion).
//
// Actualiza DOS filas en una sola operación, exactamente igual que el
// modal de edición es un único formulario:
//   1. dbo.Representantes (Nombres/Apellidos/Celular/Correo) -- el
//      registro GLOBAL de la persona, compartido entre todas las
//      empresas donde es representante (repository.updateRepresentante).
//   2. dbo.ContactoRepresentante.Cargo -- SOLO la relación de ESTA
//      empresa con este representante, nunca las relaciones que tenga
//      con otras empresas (repository.updateCargoRelacion, guardado por
//      `WHERE ContactoRepresentanteId = @id AND Activo = 1`).
//
// 🔐 CRÍTICO (restricción explícita del usuario, Fase Representantes --
// Edición): un representante puede estar asociado a VARIAS empresas
// (relación N:1 ContactoRepresentante -> Representantes). Esta función
// JAMÁS asume que `representanteId` pertenece exclusivamente a este
// `contactoId` -- por eso primero se resuelve `resolverEmpresaJuridica`
// (ownership + JURIDICA de ESTE contacto) y LUEGO se busca la relación
// activa ESPECÍFICA entre ese contacto y ese representante
// (`findRelacion`) antes de tocar cualquier fila. Editar
// Nombres/Apellidos/Celular/Correo actualiza el registro global (por
// diseño, ver Q2 de esta fase: el usuario aceptó explícitamente que el
// cambio se refleje en todas las empresas donde esta persona es
// representante) pero NUNCA toca ni rompe ninguna fila de
// dbo.ContactoRepresentante de otras empresas -- ese update es
// exclusivamente sobre dbo.Representantes por RepresentanteId. Cargo,
// en cambio, solo se actualiza en LA FILA de relación de ESTA empresa
// (`relacion.contactoRepresentanteId`), nunca en las de otras.
export async function actualizarRepresentante(
  contactoId: string,
  representanteId: string,
  input: RepresentanteUpdateInput,
  user: AuthenticatedUser,
) {
  const contacto = await resolverEmpresaJuridica(contactoId, user);

  if (!contacto) {
    return null;
  }

  const representanteIdNumerico = Number(representanteId);

  if (!Number.isInteger(representanteIdNumerico)) {
    return null;
  }

  const relacion = await repository.findRelacion(contacto.pid, representanteIdNumerico);

  if (!relacion || !relacion.activo) {
    // Mismo criterio anti-enumeración que desactivarRepresentante: no
    // hay nada que editar si la relación entre ESTA empresa y ese
    // representante no existe o ya está desactivada -- mismo `null` ->
    // 404 en la capa de Function, sin distinguir el motivo.
    return null;
  }

  await repository.updateRepresentante(representanteIdNumerico, {
    nombres: input.nombres,
    apellidos: input.apellidos,
    celular: input.celular ?? null,
    correo: input.correo ?? null,
    actualizadoNombre: user?.name || "",
    actualizadoCorreo: user?.preferred_username || "",
    actualizadoId: user.oid,
  });

  const cargoActualizado = await repository.updateCargoRelacion(
    relacion.contactoRepresentanteId,
    input.cargo,
    user.oid,
  );

  if (!cargoActualizado) {
    // Red de seguridad: la relación pasó a inactiva entre el
    // `findRelacion` de arriba y este `UPDATE ... WHERE Activo = 1`
    // (carrera con una desactivación concurrente) -- mismo `null` ->
    // 404, nunca un 500.
    return null;
  }

  return repository.findContactoRepresentantePorId(relacion.contactoRepresentanteId);
}

// ➖ DESACTIVAR (soft delete) la relación entre una empresa y un
// representante. Nunca borra la fila ni el registro de
// dbo.Representantes (Fase Representantes, decisión 4).
export async function desactivarRepresentante(
  contactoId: string,
  representanteId: string,
  user: AuthenticatedUser,
) {
  const contacto = await resolverEmpresaJuridica(contactoId, user);

  if (!contacto) {
    return null;
  }

  const representanteIdNumerico = Number(representanteId);

  if (!Number.isInteger(representanteIdNumerico)) {
    return null;
  }

  const relacion = await repository.findRelacion(contacto.pid, representanteIdNumerico);

  if (!relacion || !relacion.activo) {
    // No hay nada que desactivar: o nunca existió esa relación, o ya
    // estaba desactivada. Mismo `null` -> 404 en la capa de Function.
    return null;
  }

  await repository.desactivarRelacion(relacion.contactoRepresentanteId, user.oid);

  return true;
}
