import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Distrito } from '../../features/contactos/interfaces/direccion.interface';

/**
 * Fase Direcciones -- servicio de Ubigeo (Departamentos/Provincias/
 * Distritos). Separado de `ContactosService` a propósito:
 * `GET /api/distritos` es una ruta a nivel raíz, independiente de
 * cualquier Contacto en particular -- mismo criterio que el Backend
 * (`getDistritos.ts` no está anidado bajo `contactos/{id}`).
 */
@Injectable({
  providedIn: 'root',
})
export class UbigeoService {
  private api = `${environment.api.baseUrl}/distritos`;

  constructor(private http: HttpClient) {}

  // 🔍 Autocompletado de Distrito -- la búsqueda se ejecuta siempre en
  // el Backend (SQL Server, vía ubigeo.repository.ts), nunca con una
  // lista hardcodeada en el Frontend.
  buscarDistritos(search: string) {
    return this.http.get<Distrito[]>(this.api, { params: { search } });
  }
}
