import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';

import { ContactoCreate } from '../../features/contactos/interfaces/contacto-create.interface';
import { Contacto } from '../../features/contactos/interfaces/contacto.interface';
import { ContactoUpdate } from '../../features/contactos/interfaces/contacto-update.interface';
import {
  Representante,
  RepresentanteCreate,
  RepresentanteUpdate,
} from '../../features/contactos/interfaces/representante.interface';
import { Direccion, DireccionInput } from '../../features/contactos/interfaces/direccion.interface';
import {
  ContactoActividadRespuesta,
  ActividadNaturalInput,
  ActividadJuridicaInput,
  EmpresaBusqueda,
  TrabajoDependiente,
  TrabajoDependienteInput,
} from '../../features/contactos/interfaces/actividad.interface';

@Injectable({
  providedIn: 'root',
})
export class ContactosService {
  private api = `${environment.api.baseUrl}/contactos`;

  private refresh$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<Contacto[]>(this.api);
  }
  obtenerPorId(id: string) {
    return this.http.get<Contacto>(`${environment.api.baseUrl}/contactos/${id}`);
  }

  crearContacto(data: ContactoCreate) {
    return this.http.post<Contacto>(this.api, data);
  }

  // ✏️ Fase 3.15 / 7A — actualización PARCIAL de Contacto (Cliente +
  // Ubicación). Nunca envía tipoContacto/tipoDocumento/numeroDocumento
  // ni campos técnicos/de auditoría — `ContactoUpdate` no los declara,
  // así que TypeScript ya impide que este método intente enviarlos.
  actualizarContacto(id: string, data: ContactoUpdate) {
    return this.http.patch<Contacto>(`${environment.api.baseUrl}/contactos/${id}`, data);
  }

  // 👥 Fase Representantes — Representantes de una empresa (JURIDICA).
  // Mismo criterio que el resto del servicio: el Backend es la única
  // autoridad de ownership/JURIDICA/duplicados (ver
  // representante.service.ts) — este método solo arma la URL y envía
  // el payload, sin lógica de negocio propia.
  obtenerRepresentantes(contactoId: string) {
    return this.http.get<Representante[]>(`${this.api}/${contactoId}/representantes`);
  }

  crearRepresentante(contactoId: string, data: RepresentanteCreate) {
    return this.http.post<Representante>(`${this.api}/${contactoId}/representantes`, data);
  }

  // Endpoint NUEVO (PATCH), independiente de crearRepresentante --
  // nunca se reutiliza el alta para actualizar (mismo criterio que
  // actualizarContacto/actualizarDireccion frente a sus respectivos
  // "crear").
  actualizarRepresentante(contactoId: string, representanteId: string, data: RepresentanteUpdate) {
    return this.http.patch<Representante>(
      `${this.api}/${contactoId}/representantes/${representanteId}`,
      data,
    );
  }

  desactivarRepresentante(contactoId: string, representanteId: string) {
    return this.http.delete<void>(
      `${this.api}/${contactoId}/representantes/${representanteId}`,
    );
  }

  // 🏠 Fase Direcciones — Direcciones de un Contacto (NATURAL o
  // JURIDICA, sin límite de una sola dirección por contacto). Mismo
  // criterio que Representantes: el Backend es la única autoridad de
  // ownership/validez de idDistrito (ver direccion.service.ts) — estos
  // métodos solo arman la URL y envían el payload, sin lógica de
  // negocio propia.
  obtenerDirecciones(contactoId: string) {
    return this.http.get<Direccion[]>(`${this.api}/${contactoId}/direcciones`);
  }

  crearDireccion(contactoId: string, data: DireccionInput) {
    return this.http.post<Direccion>(`${this.api}/${contactoId}/direcciones`, data);
  }

  // Endpoint NUEVO (PATCH), independiente de crearDireccion — nunca se
  // reutiliza el alta para actualizar (mismo criterio que
  // actualizarContacto frente a crearContacto).
  actualizarDireccion(contactoId: string, direccionId: number, data: DireccionInput) {
    return this.http.patch<Direccion>(
      `${this.api}/${contactoId}/direcciones/${direccionId}`,
      data,
    );
  }

  desactivarDireccion(contactoId: string, direccionId: number) {
    return this.http.delete<void>(`${this.api}/${contactoId}/direcciones/${direccionId}`);
  }

  // 💼 Fase Trabajos Dependientes -- arquitectura independiente (Etapa
  // 2/Backend, patrón Direcciones): endpoints propios bajo
  // contactos/{contactoId}/trabajos-dependientes[/{trabajoId}],
  // independientes del PATCH de Actividad (que, desde la Etapa 3, ya
  // no acepta ni devuelve trabajos -- ver bloque "Fase Actividad" más
  // abajo). Mismo criterio que Direcciones: el Backend es la única
  // autoridad de ownership/validez de empresaContactoId (ver
  // trabajoDependiente.service.ts) -- estos métodos solo arman la URL
  // y envían el payload, sin lógica de negocio propia.
  //
  // 🔐 `trabajoId` es `string` (a diferencia de `direccionId`, que es
  // `number`) -- así lo devuelve el Backend
  // (`TrabajoDependiente.id: string`, ver
  // trabajoDependiente.repository.ts::toDomainTrabajo,
  // `String(row.Id)`); no se copia el tipo de Direcciones sin
  // verificar, se replica el shape REAL de cada recurso.
  obtenerTrabajosDependientes(contactoId: string) {
    return this.http.get<TrabajoDependiente[]>(`${this.api}/${contactoId}/trabajos-dependientes`);
  }

  crearTrabajoDependiente(contactoId: string, data: TrabajoDependienteInput) {
    return this.http.post<TrabajoDependiente>(
      `${this.api}/${contactoId}/trabajos-dependientes`,
      data,
    );
  }

  // Endpoint NUEVO (PATCH), independiente de crearTrabajoDependiente --
  // nunca se reutiliza el alta para actualizar (mismo criterio que
  // actualizarDireccion frente a crearDireccion).
  actualizarTrabajoDependiente(
    contactoId: string,
    trabajoId: string,
    data: TrabajoDependienteInput,
  ) {
    return this.http.patch<TrabajoDependiente>(
      `${this.api}/${contactoId}/trabajos-dependientes/${trabajoId}`,
      data,
    );
  }

  desactivarTrabajoDependiente(contactoId: string, trabajoId: string) {
    return this.http.delete<void>(
      `${this.api}/${contactoId}/trabajos-dependientes/${trabajoId}`,
    );
  }

  // 📋 Fase Actividad -- pestaña "Actividad" de la Ficha Contacto
  // (Grado de instrucción/Profesión/Trabajos dependientes para
  // NATURAL, CIIU para JURIDICA). Mismo criterio que Representantes/
  // Direcciones: el Backend es la única autoridad de ownership/
  // coherencia NATURAL-JURIDICA (ver contactoActividad.service.ts) --
  // estos métodos solo arman la URL y envían el payload, sin lógica de
  // negocio propia.
  //
  // 🔐 Un PATCH para NATURAL (GradoInstruccion + ProfesionOcupacion) y
  // otro para JURIDICA (solo CIIU). Desde la Etapa 3 (arquitectura
  // independiente de Trabajos Dependientes, ver bloque arriba), este
  // PATCH ya NO acepta ni devuelve trabajos -- Trabajos Dependientes
  // se guarda exclusivamente vía sus propios endpoints.
  obtenerActividad(contactoId: string) {
    return this.http.get<ContactoActividadRespuesta>(`${this.api}/${contactoId}/actividad`);
  }

  guardarActividadNatural(contactoId: string, data: ActividadNaturalInput) {
    return this.http.patch<ContactoActividadRespuesta>(`${this.api}/${contactoId}/actividad`, data);
  }

  guardarActividadJuridica(contactoId: string, data: ActividadJuridicaInput) {
    return this.http.patch<ContactoActividadRespuesta>(`${this.api}/${contactoId}/actividad`, data);
  }

  // 🔍 Buscador de "Empresa" para el modal "Trabajo dependiente" --
  // SIEMPRE acotado, en el Backend, a los Contactos JURIDICA del
  // propio usuario autenticado (ver empresaBusqueda.repository.ts) --
  // este método no cambia ni puede cambiar ese alcance.
  buscarEmpresas(search: string) {
    return this.http.get<EmpresaBusqueda[]>(`${this.api}/empresas`, { params: { search } });
  }

  // 🔥 evento global
  get refreshObservable() {
    return this.refresh$.asObservable();
  }

  triggerRefresh() {
    this.refresh$.next();
  }
}
