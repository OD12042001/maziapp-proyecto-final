import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SlaKyc {
  diasTranscurridos: number;
  umbralDias: number;
  vencido: boolean;
  fechaCorteUtc: string;
}

export interface KycDocumento {
  kycDocumentoId: number;
  documentoRequeridoId: number;
  codigo: string;
  nombre: string;
  obligatorio: boolean;
  estado: 'PENDIENTE' | 'RECIBIDO' | 'VALIDADO' | 'RECHAZADO';
  archivoReferencia: string | null;
  fechaRecepcionUtc: string | null;
  fechaRevisionUtc: string | null;
  revisadoPorId: string | null;
  revisadoPorNombre: string | null;
  observacion: string | null;
}

export interface ExpedienteKycResumen {
  kycExpedienteId: number;
  oportunidadId: number;
  contactoId: number;
  contactoNombre: string | null;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'VALIDADO' | 'RECHAZADO';
  fechaInicioUtc: string;
  fechaDictamenUtc: string | null;
  dictamenUsuarioId: string | null;
  dictamenUsuarioNombre: string | null;
  observacion: string | null;
  sla: SlaKyc;
}

export interface ExpedienteKycDetalle extends ExpedienteKycResumen {
  documentos: KycDocumento[];
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class KycService {
  private baseUrl = `${environment.api.baseUrl}/kyc`;

  constructor(private http: HttpClient) {}

  listarExpedientes(estado?: string) {
    let params = new HttpParams();
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<PageResult<ExpedienteKycResumen>>(
      `${this.baseUrl}/expedientes`,
      { params },
    );
  }

  obtenerExpediente(expedienteId: number) {
    return this.http.get<ExpedienteKycDetalle>(
      `${this.baseUrl}/expedientes/${expedienteId}`,
    );
  }

  crearExpediente(oportunidadId: number) {
    return this.http.post<ExpedienteKycDetalle>(`${this.baseUrl}/expedientes`, {
      oportunidadId,
    });
  }

  registrarRecepcion(
    expedienteId: number,
    payload: {
      documentoRequeridoCodigo: string;
      archivoReferencia: string;
      observacion?: string;
    },
  ) {
    return this.http.post<KycDocumento>(
      `${this.baseUrl}/expedientes/${expedienteId}/documentos`,
      payload,
    );
  }

  revisarDocumento(
    expedienteId: number,
    documentoId: number,
    payload: {
      estado: 'RECIBIDO' | 'VALIDADO' | 'RECHAZADO';
      observacion?: string;
    },
  ) {
    return this.http.patch<KycDocumento>(
      `${this.baseUrl}/expedientes/${expedienteId}/documentos/${documentoId}`,
      payload,
    );
  }

  dictaminar(
    expedienteId: number,
    payload: {
      estado: 'VALIDADO' | 'RECHAZADO';
      observacion?: string;
    },
  ) {
    return this.http.post<ExpedienteKycDetalle>(
      `${this.baseUrl}/expedientes/${expedienteId}/dictamen`,
      payload,
    );
  }
}
