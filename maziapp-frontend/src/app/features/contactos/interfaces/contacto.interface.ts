/**
 * Tipado del contacto tal como lo devuelve el backend.
 *
 * Corregido en la Fase 3.8: el shape anterior (`demografia`/`ubicacion`)
 * NO coincidía con lo que realmente devuelve `GET /api/contactos`
 * (`contacto.repository.ts::toDomain()`, Backend, sin cambios en esta
 * fase) — el Backend siempre devolvió un objeto PLANO (`nombres`,
 * `apellidos`, `numeroDocumento`, `correo`, `celular` directamente en
 * la raíz, no anidados). Ese mismatch es la causa exacta de que la
 * tabla de Contactos mostrara filas con DNI/Nombres/Apellidos/Correo/
 * Teléfono vacíos (ver informe Fase 3.8): los bindings del template
 * leían `c.demografia?.dni`, que siempre era `undefined` porque esa
 * propiedad nunca existió en la respuesta real.
 *
 * Esta interface ahora refleja el shape REAL devuelto por el Backend
 * (confirmado leyendo `toDomain()` línea por línea, no asumido).
 *
 * Deliberadamente no exhaustivo: los bloques que todavía pertenecen a
 * módulos futuros (financiera, actividad, patrimonial, productos,
 * notas) no forman parte del contrato actual de creación/listado y no
 * se incluyen aquí — el Backend tampoco los devuelve todavía.
 */
export interface Contacto {
  id: string;
  pid: number;

  tipoContacto: 'NATURAL' | 'JURIDICA';
  tipoDocumento: string;
  numeroDocumento: string;

  nombres: string | null;
  apellidos: string | null;
  razonSocial: string | null;

  fechaNacimiento: string | null;
  sexo: string | null;
  estadoCivil: string | null;
  nacionalidad: string | null;
  paisResidencia: string | null;
  esPep: boolean;

  estadoContacto: string;

  celular: string | null;
  correo: string | null;
  telefonoFijo: string | null;

  responsableId: string;

  creado: {
    fecha: string | null;
    nombre: string;
    correo: string;
    id: string;
  };

  actualizado: {
    fecha: string | null;
    nombre: string;
    correo: string;
    id: string;
  } | null;
}
