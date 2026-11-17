import * as repository from "../../repositories/contactos/contacto.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { ContactoCreateInput } from "../../validators/contacto.validator";
import { ContactoUpdateInput } from "../../validators/contactoUpdate.validator";

// 🔐 Fase 3.15 / 7A — error de negocio (no de formato) para el update
// de Contactos. Se distingue de un fallo de Zod: Zod ya garantizó que
// el PAYLOAD tiene el formato correcto; este error se lanza cuando el
// payload, aunque bien formado, es incoherente con el `tipoContacto`
// YA EXISTENTE en BD (ej.: enviar `razonSocial` para un contacto
// NATURAL, o `nombres`/`apellidos` para uno JURIDICA). El Function
// (updateContacto.ts) lo traduce a HTTP 400 con un mensaje seguro, sin
// exponer detalles internos.
export class ContactoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactoValidationError";
  }
}

// 🔍 LISTAR
//
// Migración de roles (agosto 2026): este endpoint ya es exclusivo de
// Freelance/ejecutivo_inversion (ver CONTACTOS_ROLES_PERMITIDOS en
// config/roles.ts, aplicado en createContacto.ts/getContactos.ts vía
// withAuth) — ningún otro rol llega hasta aquí. Se retira la rama
// "ver todos los Contactos" que antes activaba supervisor_inversion
// (isSupervisor): ese rol es legacy y su capacidad de "ver todos" no
// tiene, hoy, un rol sucesor confirmado por el dueño del proyecto (ver
// Auditoria_MaziFlow_Migracion_Roles.docx, secciones 13-16) — no se
// inventa una regla de negocio nueva para reemplazarla. El listado
// queda, por tanto, siempre acotado a la cartera del usuario
// autenticado (Fase 1.1, Decisión 4 — ResponsableId, no CreadoId).
export async function listarContactos(user: AuthenticatedUser) {
  return repository.findContactosByOwner(user.oid);
}

// 🔍 OBTENER POR ID
//
// Mismo razonamiento que listarContactos(): sin rama "ver todos". Se
// mantiene la autorización por dueño del recurso y el anti-enumeración
// (404, no 403, cuando el contacto existe pero no es del usuario) — sin
// cambios respecto al comportamiento ya validado para Freelance.
//
// 🔧 Fase 3.13 — CORRECCIÓN DE OWNERSHIP (case-insensitive):
// diagnosticado con evidencia real (logs temporales, ya retirados) que
// `mssql`/`tedious` devuelve los `uniqueidentifier` de SQL Server en
// MAYÚSCULAS al leerlos, mientras que el claim `oid` que emite
// Microsoft Entra ID en el JWT llega en minúsculas. Es el MISMO GUID
// en ambos casos (confirmado: `responsableIdBD` y `oidUsuario`
// coinciden al normalizar mayúsculas/minúsculas), por lo que una
// comparación `===`/`!==` de strings sin normalizar los trataba como
// usuarios distintos y el contacto recién creado por su propio dueño
// nunca se encontraba (404 "Contacto no encontrado").
//
// La corrección normaliza AMBOS valores a minúsculas antes de
// comparar — no cambia la regla de negocio (sigue siendo
// responsableId === user.oid, el mismo GUID), no toca SQL, no toca el
// tipo UNIQUEIDENTIFIER de la BD, no toca el JWT/Entra ID, y preserva
// exactamente el mismo comportamiento anti-enumeración: si cualquiera
// de los dos valores falta (fila sin ResponsableId, o token sin oid),
// el ownership falla de forma segura (null / 404), nunca se asume
// autorizado por ausencia de dato.
export async function obtenerContactoPorId(
  id: string,
  user: AuthenticatedUser,
) {
  const contacto = await repository.findContactoById(id);

  if (!contacto) {
    return null;
  }

  const responsableId = contacto.responsableId?.toLowerCase();
  const usuarioOid = user?.oid?.toLowerCase();

  if (!responsableId || !usuarioOid || responsableId !== usuarioOid) {
    return null;
  }

  return contacto;
}

// ➕ CREAR
// 🔐 MUY IMPORTANTE (Fase 3, secciones 3 y 5): este objeto se construye
// EXPLÍCITAMENTE campo por campo. Nunca `{ ...input, responsableId:
// user.oid }` ni variantes con spread — así, aunque en el futuro el
// Zod schema cambiara y por error incluyera `responsableId` o
// `creadoId` como campos aceptados, esta función seguiría sin leerlos
// de `input`: ResponsableId y CreadoId provienen EXCLUSIVAMENTE de
// `user` (el usuario ya autenticado y validado contra el token JWT en
// withAuth/validateToken). EstadoContacto se fija siempre a 'ACTIVO'
// en la creación; el cliente no tiene forma de decidirlo (ni siquiera
// existe en el Zod schema de entrada).
export async function crearContacto(
  input: ContactoCreateInput,
  user: AuthenticatedUser,
) {
  return repository.saveContacto({
    tipoContacto: input.tipoContacto,
    tipoDocumento: input.tipoDocumento,
    numeroDocumento: input.numeroDocumento,
    nombres: input.nombres ?? null,
    apellidos: input.apellidos ?? null,
    razonSocial: input.razonSocial ?? null,
    fechaNacimiento: input.fechaNacimiento ?? null,
    sexo: input.sexo ?? null,
    estadoCivil: input.estadoCivil ?? null,
    // Fase 3, punto 12: sin DEFAULT indiscriminado — se persiste
    // exactamente lo que envía el cliente, o NULL si no envía nada.
    nacionalidad: input.nacionalidad ?? null,
    paisResidencia: input.paisResidencia ?? null,
    esPep: input.esPep ?? false,
    estadoContacto: "ACTIVO",
    celular: input.celular ?? null,
    correo: input.correo ?? null,
    telefonoFijo: input.telefonoFijo ?? null,
    responsableId: user.oid,
    creadoNombre: user?.name || "",
    creadoCorreo: user?.preferred_username || "",
    creadoId: user.oid,
  });
}
// ✏️ ACTUALIZAR (Fase 3.15 / 7A — Cliente + Ubicación)
//
// Reutiliza `obtenerContactoPorId` para resolver EN UN SOLO PASO tanto
// "¿existe?" como "¿es del usuario autenticado?" — la misma
// comparación de ownership case-insensitive de la Fase 3.13, sin
// reimplementarla aquí. Igual que en el GET, no existe una rama 403:
// si el contacto no existe o no pertenece al usuario, se devuelve
// `null` y el Function responde 404 (anti-enumeración, sin cambios).
//
// Coherencia NATURAL/JURIDICA: el payload de entrada (`ContactoUpdateInput`)
// nunca incluye `tipoContacto` — no puede modificarse (Zod `.strict()`
// ni siquiera lo declara). Por eso el único lugar donde se puede saber
// si `razonSocial` o `nombres`/`apellidos` son válidos para ESTE
// contacto es aquí, consultando el tipo de la fila YA EXISTENTE
// (`contacto.tipoContacto`, obtenida arriba) — nunca se infiere del
// payload ni se asume.
//
// 🔐 "No pisar con vacío": este service solo reenvía al repository las
// claves que el CLIENTE realmente envió (`input`, ya filtrado por Zod
// `.strict()` + `.optional()` — las claves ausentes ni siquiera llegan
// aquí como propiedades del objeto). No se agrega ningún `?? null` ni
// valor por defecto sobre claves ausentes: eso es exactamente lo que
// convertiría un guardado parcial en un guardado destructivo.
export async function actualizarContacto(
  id: string,
  input: ContactoUpdateInput,
  user: AuthenticatedUser,
) {
  const contacto = await obtenerContactoPorId(id, user);

  if (!contacto) {
    return null;
  }

  if (contacto.tipoContacto === "NATURAL" && input.razonSocial !== undefined) {
    throw new ContactoValidationError(
      "razonSocial no es válido para un contacto de tipo NATURAL",
    );
  }

  if (
    contacto.tipoContacto === "JURIDICA" &&
    (input.nombres !== undefined || input.apellidos !== undefined)
  ) {
    throw new ContactoValidationError(
      "nombres/apellidos no son válidos para un contacto de tipo JURIDICA",
    );
  }

  const numericId = Number(id);

  if (!Number.isInteger(numericId)) {
    return null;
  }

  // 📌 Solo se copian las claves PRESENTES en `input` (misma lógica de
  // "no pisar con vacío" explicada arriba) — nunca `{ ...input }`
  // directo hacia el repository, para que quede explícito, campo por
  // campo, qué puede llegar a esta actualización y qué no (mismo
  // criterio ya aplicado en `crearContacto`).
  const fields: repository.ActualizacionContacto = {};

  if (input.nombres !== undefined) fields.nombres = input.nombres;
  if (input.apellidos !== undefined) fields.apellidos = input.apellidos;
  if (input.razonSocial !== undefined) fields.razonSocial = input.razonSocial;
  if (input.fechaNacimiento !== undefined) fields.fechaNacimiento = input.fechaNacimiento;
  if (input.sexo !== undefined) fields.sexo = input.sexo;
  if (input.estadoCivil !== undefined) fields.estadoCivil = input.estadoCivil;
  if (input.nacionalidad !== undefined) fields.nacionalidad = input.nacionalidad;
  if (input.paisResidencia !== undefined) fields.paisResidencia = input.paisResidencia;
  if (input.esPep !== undefined) fields.esPep = input.esPep;
  if (input.celular !== undefined) fields.celular = input.celular;
  if (input.correo !== undefined) fields.correo = input.correo;
  if (input.telefonoFijo !== undefined) fields.telefonoFijo = input.telefonoFijo;

  if (Object.keys(fields).length === 0) {
    // Nada que actualizar: se devuelve el contacto sin tocar la BD,
    // en vez de ejecutar un UPDATE con SET vacío.
    return contacto;
  }

  return repository.updateContacto(numericId, fields, {
    actualizadoId: user.oid,
    actualizadoNombre: user?.name || "",
    actualizadoCorreo: user?.preferred_username || "",
  });
}
