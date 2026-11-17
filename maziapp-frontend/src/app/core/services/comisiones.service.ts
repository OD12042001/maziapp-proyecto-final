import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PageResult } from './kyc.service';

export interface ProyectoResumen {
  proyectoId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  monedaCodigo: 'PEN' | 'USD';
  montoObjetivo: number | null;
  activo: boolean;
}

export interface CierreInversion {
  cierreId: number;
  oportunidadId: number;
  proyecto: ProyectoResumen;
  montoCaptado: number;
  monedaCodigo: 'PEN' | 'USD';
  fechaCierreUtc: string;
  freelanceId: string;
  estado: 'REGISTRADO' | 'ANULADO';
  comisionId: number | null;
  comisionEstado: 'PENDIENTE' | 'LIQUIDADA' | 'REVERTIDA' | null;
}

export interface ComisionReversion {
  reversionId: number;
  comisionId: number;
  motivoCodigo: 'KYC_RECHAZADO' | 'DESEMBOLSO_NO_CONCRETADO';
  motivoDetalle: string | null;
  estadoKyc: string | null;
  estadoDesembolso: string | null;
  fechaEvaluacionUtc: string;
  fechaReversionUtc: string;
  registradoPorId: string;
  registradoPorNombre: string | null;
  observacion: string | null;
}

export interface Comision {
  comisionId: number;
  cierreId: number;
  oportunidadId: number;
  proyectoNombre: string;
  freelanceId: string;
  monedaCodigo: 'PEN' | 'USD';
  montoCaptado: number;
  tasaPorcentaje: number;
  porcentajeIgv: number;
  importeTotal: number;
  baseImponible: number;
  importeIgv: number;
  estado: 'PENDIENTE' | 'LIQUIDADA' | 'REVERTIDA';
  fechaCalculoUtc: string;
  reversion: ComisionReversion | null;
}

export interface OutboxProcesarResultado {
  procesados: number;
  publicados: number;
  fallidos: number;
  muertos: number;
}

@Injectable({
  providedIn: 'root',
})
export class ComisionesService {
  private apiUrl = environment.api.baseUrl;

  constructor(private http: HttpClient) {}

  listarCierres(estado?: string) {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PageResult<CierreInversion>>(
      `${this.apiUrl}/cierres`,
      { params },
    );
  }

  registrarCierre(
    payload: {
      oportunidadId: number;
      proyectoId: number;
      montoCaptado: number;
      monedaCodigo: 'PEN' | 'USD';
      fechaCierreUtc: string;
    },
    idempotencyKey: string,
  ) {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<CierreInversion>(`${this.apiUrl}/cierres`, payload, {
      headers,
    });
  }

  listarComisiones(estado?: string) {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PageResult<Comision>>(`${this.apiUrl}/comisiones`, {
      params,
    });
  }

  revertirComision(
    comisionId: number,
    payload: {
      motivoCodigo: 'KYC_RECHAZADO' | 'DESEMBOLSO_NO_CONCRETADO';
      motivoDetalle?: string;
      estadoKyc?: string;
      estadoDesembolso?: string;
      fechaEvaluacionUtc: string;
      observacion?: string;
    },
    idempotencyKey: string,
  ) {
    const headers = new HttpHeaders({ 'Idempotency-Key': idempotencyKey });
    return this.http.post<Comision>(
      `${this.apiUrl}/comisiones/${comisionId}/reversion`,
      payload,
      { headers },
    );
  }

  procesarOutbox(limite = 20) {
    return this.http.post<OutboxProcesarResultado>(
      `${this.apiUrl}/esb/outbox/procesar`,
      { limite },
    );
  }
}
