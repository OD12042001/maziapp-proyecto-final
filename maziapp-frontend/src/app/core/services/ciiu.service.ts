import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { Ciiu } from '../../features/contactos/interfaces/actividad.interface';

/**
 * Fase Actividad -- servicio del catálogo CIIU. Separado de
 * `ContactosService` a propósito, mismo criterio exacto que
 * `UbigeoService`/`getDistritos.ts`: `GET /api/ciiu` es una ruta a
 * nivel raíz, independiente de cualquier Contacto en particular (mismo
 * criterio que el Backend -- `getCiiu.ts` no está anidado bajo
 * `contactos/{id}`).
 */
@Injectable({
  providedIn: 'root',
})
export class CiiuService {
  private api = `${environment.api.baseUrl}/ciiu`;

  constructor(private http: HttpClient) {}

  // 🔍 Autocompletado de CIIU -- la búsqueda se ejecuta siempre en el
  // Backend (SQL Server, vía ciiu.repository.ts), nunca con una lista
  // hardcodeada en el Frontend. Puede devolver [] hasta que se cargue
  // el catálogo oficial (dbo.CatalogoCiiu, todavía sin datos) -- eso
  // es esperado, no un error.
  buscarCiiu(search: string) {
    return this.http.get<Ciiu[]>(this.api, { params: { search } });
  }
}
