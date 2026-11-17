/**
 * Contrato de actualización PARCIAL de Contacto — Fase 3.15 / 7A
 * (Cliente + Ubicación).
 *
 * Alineado 1:1 con `contactoUpdateSchema` del Backend (Fase 3.15,
 * `maziapp-backend/src/validators/contactoUpdate.validator.ts`,
 * `.strict()`). Todos los campos son opcionales: el Frontend solo
 * envía las claves de la sección que está guardando (Cliente o
 * Ubicación) — una clave ausente significa "no tocar esa columna".
 *
 * Deliberadamente NO incluye `id`, `responsableId`, `creadoId`,
 * `creadoFecha`, `creadoNombre`, `creadoCorreo`, `actualizadoId`,
 * `actualizadoFecha`, `actualizadoNombre`, `actualizadoCorreo`,
 * `estadoContacto`, `tipoContacto`, `tipoDocumento` ni
 * `numeroDocumento`: el Backend los rechaza con 400 (`.strict()`) si
 * el Frontend los enviara. El Frontend nunca debe intentar enviarlos.
 */
export interface ContactoUpdate {
  /** Solo aplica cuando tipoContacto = 'NATURAL'. */
  nombres?: string;

  /** Solo aplica cuando tipoContacto = 'NATURAL'. */
  apellidos?: string;

  /** Solo aplica cuando tipoContacto = 'JURIDICA'. */
  razonSocial?: string;

  fechaNacimiento?: string;
  sexo?: 'MASCULINO' | 'FEMENINO';
  estadoCivil?: string;
  nacionalidad?: string;
  paisResidencia?: string;
  esPep?: boolean;

  celular?: string;
  correo?: string;
  telefonoFijo?: string;
}
