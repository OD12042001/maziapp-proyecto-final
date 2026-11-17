import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

/**
 * MEJORA (auditoría #2 - ALTO): el proyecto original tenía las URLs de
 * embed de Power BI hardcodeadas en el frontend (visibles en el bundle
 * público, protegidas solo por el guard de Angular). Ahora el frontend
 * solo pide "dame el embed del reporte X" y es el backend
 * (GET /api/reportes/:key) quien valida el rol y decide si entrega la
 * URL — reutilizando los mismos roles que ya usaba app.routes.ts.
 */
@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private api = `${environment.api.baseUrl}/reportes`;

  constructor(private http: HttpClient) {}

  obtenerEmbed(key: string) {
    return this.http.get<{ url: string }>(`${this.api}/${key}`);
  }
}
