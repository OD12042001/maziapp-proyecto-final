/**
 * Contrato de creación de Contacto — Fase 3.5.
 *
 * Alineado 1:1 con `contactoCreateSchema` del Backend (Fase 3,
 * `maziapp-backend/src/validators/contacto.validator.ts`, `.strict()`).
 *
 * Deliberadamente NO incluye `id`, `responsableId`, `creadoId`,
 * `creadoFecha`, `creadoNombre`, `creadoCorreo`, `actualizadoId`,
 * `actualizadoFecha`, `actualizadoNombre`, `actualizadoCorreo` ni
 * `estadoContacto`: esos campos son construidos exclusivamente por el
 * Backend a partir del usuario autenticado, y el schema del Backend
 * rechaza con 400 cualquier request que los incluya. No se agregan
 * aquí "por si acaso" — el Frontend nunca debe intentar enviarlos.
 */
export type TipoContacto = 'NATURAL' | 'JURIDICA';

export type TipoDocumentoNatural = 'DNI' | 'CE' | 'PASAPORTE';

export type TipoDocumento = TipoDocumentoNatural | 'RUC';

export interface ContactoCreate {
  tipoContacto: TipoContacto;
  tipoDocumento: TipoDocumento;
  /**
   * Nombre correcto según el contrato del Backend. NO usar `dni` — el
   * Backend lo rechaza con 400 (`.strict()`, propiedad no reconocida).
   */
  numeroDocumento: string;

  /** Solo aplica cuando tipoContacto = 'NATURAL'. */
  nombres?: string;

  /** Solo aplica cuando tipoContacto = 'NATURAL'. */
  apellidos?: string;

  /** Solo aplica cuando tipoContacto = 'JURIDICA'. */
  razonSocial?: string;

  celular?: string;
}
