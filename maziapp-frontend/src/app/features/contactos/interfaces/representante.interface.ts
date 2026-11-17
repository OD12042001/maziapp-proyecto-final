/**
 * Fase Representantes — tipado de Representantes de una empresa
 * (contacto JURIDICA), tal como lo devuelve/espera el Backend.
 *
 * Mismo criterio que `contacto.interface.ts`: refleja el shape PLANO
 * real (`representante.repository.ts::toDomainContactoRepresentante` /
 * `toDomainRepresentante`, Backend, sin cambios en esta fase) — nunca
 * se asume ni se inventa un shape distinto.
 *
 * Un representante es SIEMPRE persona natural: `tipoDocumento` se
 * limita a DNI/CE/PASAPORTE (RUC no es válido aquí — ver
 * `representante.validator.ts`, Backend).
 */
export type TipoDocumentoRepresentante = 'DNI' | 'CE' | 'PASAPORTE';

/**
 * Representante tal como aparece en la lista de una empresa
 * (`GET /api/contactos/{contactoId}/representantes`) o como respuesta
 * de un alta (`POST` del mismo recurso) o de una edición (`PATCH` del
 * mismo recurso) — mismo shape en los tres casos
 * (`findRepresentantesByContacto` / `crearRepresentante` /
 * `actualizarRepresentante`, Backend).
 *
 * `contactoRepresentanteId` identifica la RELACIÓN (única por
 * contacto+representante activo) — es la que se usa para desactivar,
 * nunca `representanteId` (que identifica a la PERSONA, reutilizable
 * entre varias empresas).
 */
export interface Representante {
  contactoRepresentanteId: string;
  representanteId: string;

  tipoDocumento: TipoDocumentoRepresentante;
  numeroDocumento: string;

  nombres: string;
  apellidos: string;

  // Cargo pertenece a la RELACIÓN (dbo.ContactoRepresentante), no a la
  // persona — puede variar entre distintas empresas para el mismo
  // representante.
  cargo: string;

  celular: string | null;
  correo: string | null;
}

/**
 * Payload de alta — mismo contrato que
 * `representanteCreateBaseSchema` (`representante.validator.ts`,
 * Backend): `.strict()`, sin ningún campo técnico/de auditoría
 * (contactoRepresentanteId/representanteId/activo/etc. NUNCA se
 * envían desde el Frontend).
 */
export interface RepresentanteCreate {
  tipoDocumento: TipoDocumentoRepresentante;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  celular?: string;
  correo?: string;
}

/**
 * Payload de edición — mismo contrato que
 * `representanteUpdateBaseSchema` (`representante.validator.ts`,
 * Backend): `.strict()`, SIN `tipoDocumento`/`numeroDocumento`
 * (deliberadamente de solo lectura al editar — son la llave de
 * identidad de la persona, ver el comentario en el validador del
 * Backend) y sin ningún otro campo técnico/de auditoría.
 */
export interface RepresentanteUpdate {
  nombres: string;
  apellidos: string;
  cargo: string;
  celular?: string;
  correo?: string;
}
