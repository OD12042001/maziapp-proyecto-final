/**
 * Fase Direcciones -- tipado de Direcciones de un Contacto, tal como
 * lo devuelve/espera el Backend.
 *
 * Mismo criterio que representante.interface.ts: refleja el shape
 * PLANO real (direccion.repository.ts::toDomainDireccion, Backend, sin
 * cambios en esta fase) -- nunca se asume ni se inventa un shape
 * distinto. Departamento/Provincia SIEMPRE llegan resueltos por JOIN
 * desde el Backend a través de idDistrito -- este Frontend nunca los
 * reconstruye ni los guarda por separado.
 */
export interface Direccion {
  idDireccion: number;
  idContacto: number;
  idDistrito: number;

  distrito: string;
  provincia: string;
  departamento: string;

  calle: string;
  numero: string;
  departamentoInterior: string | null;

  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

/**
 * Un Distrito tal como lo devuelve `GET /api/distritos?search=...` --
 * mismo shape mínimo exigido por la especificación de esta fase:
 * {idDistrito, distrito, provincia, departamento}.
 */
export interface Distrito {
  idDistrito: number;
  distrito: string;
  provincia: string;
  departamento: string;
}

/**
 * Payload de creación/actualización de una Dirección -- mismo
 * contrato que `direccionBaseSchema` (direccion.validator.ts,
 * Backend): `.strict()`, sin ningún campo técnico/de auditoría
 * (idDireccion/idContacto/activo/etc. NUNCA se envían desde el
 * Frontend).
 */
export interface DireccionInput {
  idDistrito: number;
  calle: string;
  numero: string;
  departamentoInterior?: string;
}
