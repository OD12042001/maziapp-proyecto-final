/**
 * Fase Actividad -- tipado de la pestaña "Actividad" de la Ficha
 * Contacto, tal como lo devuelve/espera el Backend
 * (contactoActividad.repository.ts::toDomainActividad/toDomainTrabajo,
 * contactoActividad.validator.ts/trabajoDependiente.validator.ts).
 *
 * Mismo criterio que direccion.interface.ts/representante.interface.ts:
 * refleja el shape PLANO real, nunca se asume ni se inventa un shape
 * distinto.
 *
 * IMPORTANTE -- distinto de dbo.Actividades (bitácora de interacciones
 * comerciales). Este archivo no tiene relación con esa tabla.
 */

// Catálogo cerrado -- únicamente las dos opciones confirmadas por el
// dueño del proyecto. No se agrega ninguna otra por iniciativa propia.
export type GradoInstruccion = 'TECNICO' | 'SUPERIOR';

/**
 * Resultado del buscador de Empresa (`GET /api/contactos/empresas`) --
 * un Contacto JURIDICA visible para el usuario autenticado.
 */
export interface EmpresaBusqueda {
  contactoId: string;
  razonSocial: string;
}

/**
 * Un código CIIU tal como lo devuelve `GET /api/ciiu?search=...`.
 */
export interface Ciiu {
  ciiuId: number;
  codigo: string;
  descripcion: string;
}

/**
 * La Empresa de un Trabajo dependiente ya guardado -- el Backend
 * resuelve internamente si corresponde a un Contacto JURIDICA
 * (`tipo: 'CONTACTO'`, con `nombre` = RazonSocial resuelta por JOIN) o
 * a texto libre (`tipo: 'LIBRE'`, sin `contactoId`). El Frontend NUNCA
 * ve `empresaContactoId`/`empresaNombreLibre` por separado -- ver
 * misma nota en contactoActividad.repository.ts (Backend).
 */
export interface TrabajoDependienteEmpresa {
  tipo: 'CONTACTO' | 'LIBRE';
  contactoId: string | null;
  nombre: string;
}

export interface TrabajoDependiente {
  id: string;
  contactoId: string;
  empresa: TrabajoDependienteEmpresa;
  cargo: string;
  desde: string;
  hasta: string | null;
  creado: { fecha: string | null; nombre: string | null };
}

export interface ContactoActividadDatos {
  contactoId: string;
  gradoInstruccion: GradoInstruccion | null;
  profesionOcupacion: string | null;
  ciiuId: number | null;
  // 🔐 Resueltos por el Backend vía LEFT JOIN a dbo.CatalogoCiiu (mismo
  // criterio que Direccion.distrito/provincia/departamento) -- este
  // Frontend nunca reconstruye el código/descripción a partir de
  // ciiuId por su cuenta.
  ciiuCodigo: string | null;
  ciiuDescripcion: string | null;
  creado: { fecha: string | null; nombre: string | null; correo: string | null; id: string | null };
  actualizado: {
    fecha: string | null;
    nombre: string | null;
    correo: string | null;
    id: string | null;
  } | null;
}

/**
 * Respuesta de `GET /api/contactos/{id}/actividad` y de
 * `PATCH /api/contactos/{id}/actividad` (mismo shape en ambos --
 * ver getContactoActividad.ts/updateContactoActividad.ts, Backend).
 * `actividad` es `null` si el contacto todavía no guardó nunca esta
 * pestaña.
 *
 * 🔐 ETAPA 5 (arquitectura independiente de Trabajos Dependientes,
 * continuación de la Etapa 3/Backend): este shape YA NO declara
 * `trabajos` -- verificado contra el Backend real
 * (contactoActividad.service.ts::obtenerActividad/
 * guardarActividadNatural, ambos devuelven únicamente
 * `{ tipoContacto, actividad }`). La única fuente de verdad para
 * Trabajos Dependientes es `GET /api/contactos/{id}/trabajos-dependientes`
 * (`TrabajoDependiente`, arriba), consumida directamente por
 * `contacto-actividad.component.ts` -- nunca desde esta respuesta.
 */
export interface ContactoActividadRespuesta {
  tipoContacto: 'NATURAL' | 'JURIDICA';
  actividad: ContactoActividadDatos | null;
}

/**
 * Payload de `POST`/`PATCH` de
 * `/api/contactos/{contactoId}/trabajos-dependientes[/{trabajoId}]` --
 * exactamente uno de `empresaContactoId`/`empresaNombreLibre` --
 * decidido internamente por el modal (nunca elegido por el usuario,
 * que solo ve un campo "Empresa" -- ver
 * trabajo-dependiente-modal.component.ts).
 */
export interface TrabajoDependienteInput {
  empresaContactoId?: number;
  empresaNombreLibre?: string;
  cargo: string;
  desde: string;
  hasta?: string;
}

/**
 * Payload de `PATCH /api/contactos/{id}/actividad` para un contacto
 * NATURAL -- mismo contrato `.strict()` que
 * contactoActividad.validator.ts (Backend): gradoInstruccion y
 * profesionOcupacion OBLIGATORIOS.
 *
 * 🔐 ETAPA 5: ya NO declara `trabajosNuevos` -- verificado contra el
 * Backend real (contactoActividad.validator.ts: "trabajosNuevos fue
 * RETIRADO de este schema... enviarlo en el body de este PATCH ahora
 * se RECHAZA con 400"). Trabajos Dependientes se guarda exclusivamente
 * vía sus propios endpoints independientes (ver `TrabajoDependienteInput`
 * arriba).
 */
export interface ActividadNaturalInput {
  gradoInstruccion: GradoInstruccion;
  profesionOcupacion: string;
}

/**
 * Payload de `PATCH /api/contactos/{id}/actividad` para un contacto
 * JURIDICA -- únicamente ciiuId, OBLIGATORIO.
 */
export interface ActividadJuridicaInput {
  ciiuId: number;
}
