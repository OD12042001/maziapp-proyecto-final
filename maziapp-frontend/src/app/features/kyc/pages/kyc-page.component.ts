import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLES_KYC_DICTAMEN } from '../../../core/auth/app-roles';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ExpedienteKycDetalle,
  ExpedienteKycResumen,
  KycDocumento,
  KycService,
} from '../../../core/services/kyc.service';

@Component({
  selector: 'app-kyc-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="kyc-container">
      <header class="page-header">
        <div>
          <h1>Gestión de Expedientes KYC (S12 / S13)</h1>
          <p class="subtitle">
            Checklist documental regulatorio, control de SLA y dictamen de Compliance
          </p>
        </div>
        <div class="role-badge">
          <span *ngIf="puedeDictaminar()" class="badge badge-compliance">
            Rol Compliance habilitado (Validación y Dictamen)
          </span>
          <span *ngIf="!puedeDictaminar()" class="badge badge-freelance">
            Modo Ejecutivo (Carga documental — Dictamen exclusivo de Compliance)
          </span>
        </div>
      </header>

      <section class="toolbar-card">
        <div class="toolbar-group">
          <label for="filtroEstado">Estado:</label>
          <select
            id="filtroEstado"
            [(ngModel)]="filtroEstado"
            (change)="cargarExpedientes()"
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="EN_PROCESO">EN_PROCESO</option>
            <option value="VALIDADO">VALIDADO</option>
            <option value="RECHAZADO">RECHAZADO</option>
          </select>
          <button type="button" class="btn-secondary" (click)="cargarExpedientes()">
            Actualizar
          </button>
        </div>

        <form class="toolbar-group" (ngSubmit)="crearExpediente()">
          <label for="oportunidadIdInput">Nueva apertura (Oportunidad ID):</label>
          <input
            id="oportunidadIdInput"
            type="number"
            min="1"
            [(ngModel)]="nuevaOportunidadId"
            name="nuevaOportunidadId"
            placeholder="Ej. 1"
          />
          <button type="submit" class="btn-primary">Abrir expediente KYC</button>
        </form>
      </section>

      <p *ngIf="mensaje()" class="alert alert-info">{{ mensaje() }}</p>
      <p *ngIf="error()" class="alert alert-error">{{ error() }}</p>

      <div class="grid-layout">
        <section class="card">
          <h2>Expedientes ({{ expedientes().length }})</h2>
          <table class="data-table" *ngIf="expedientes().length > 0; else sinExpedientes">
            <thead>
              <tr>
                <th>ID</th>
                <th>Oportunidad</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>SLA (S13)</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let exp of expedientes()"
                [class.selected]="detalle()?.kycExpedienteId === exp.kycExpedienteId"
              >
                <td>#{{ exp.kycExpedienteId }}</td>
                <td>Op. #{{ exp.oportunidadId }}</td>
                <td>{{ exp.contactoNombre || ('Contacto #' + exp.contactoId) }}</td>
                <td>
                  <span class="status-pill" [attr.data-estado]="exp.estado">
                    {{ exp.estado }}
                  </span>
                </td>
                <td>
                  <span [class.sla-expired]="exp.sla.vencido">
                    {{ exp.sla.diasTranscurridos }} / {{ exp.sla.umbralDias }} d
                    ({{ exp.sla.vencido ? 'VENCIDO' : 'EN PLAZO' }})
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    class="btn-link"
                    (click)="seleccionarExpediente(exp.kycExpedienteId)"
                  >
                    Ver checklist
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #sinExpedientes>
            <p class="empty-state">No hay expedientes KYC registrados para el filtro actual.</p>
          </ng-template>
        </section>

        <section class="card" *ngIf="detalle() as exp">
          <div class="detail-header">
            <h2>
              Expediente #{{ exp.kycExpedienteId }} — Oportunidad #{{ exp.oportunidadId }}
            </h2>
            <span class="status-pill" [attr.data-estado]="exp.estado">
              {{ exp.estado }}
            </span>
          </div>

          <p class="sla-summary">
            <strong>Control de tiempos (S13):</strong>
            {{ exp.sla.diasTranscurridos }} días transcurridos de
            {{ exp.sla.umbralDias }} días de SLA —
            <strong>{{ exp.sla.vencido ? 'SLA VENCIDO' : 'Dentro del SLA' }}</strong>
          </p>

          <h3>Checklist documental (S12)</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Documento</th>
                <th>Estado</th>
                <th>Archivo / Referencia</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let doc of exp.documentos">
                <td><code>{{ doc.codigo }}</code></td>
                <td>{{ doc.nombre }}</td>
                <td>
                  <span class="status-pill" [attr.data-estado]="doc.estado">
                    {{ doc.estado }}
                  </span>
                </td>
                <td>
                  <input
                    type="text"
                    [(ngModel)]="archivosPorCodigo[doc.codigo]"
                    [placeholder]="doc.archivoReferencia || 'https://repositorio/archivo.pdf'"
                    [disabled]="esFinal(exp.estado)"
                  />
                </td>
                <td class="actions-cell">
                  <button
                    type="button"
                    class="btn-secondary"
                    [disabled]="esFinal(exp.estado) || esFinal(doc.estado)"
                    (click)="cargarDocumento(exp.kycExpedienteId, doc)"
                  >
                    Cargar (Recibir)
                  </button>
                  <button
                    *ngIf="puedeDictaminar()"
                    type="button"
                    class="btn-success"
                    [disabled]="esFinal(exp.estado) || doc.estado !== 'RECIBIDO'"
                    (click)="revisarDocumento(exp.kycExpedienteId, doc, 'VALIDADO')"
                  >
                    Validar
                  </button>
                  <button
                    *ngIf="puedeDictaminar()"
                    type="button"
                    class="btn-danger"
                    [disabled]="esFinal(exp.estado) || doc.estado !== 'RECIBIDO'"
                    (click)="revisarDocumento(exp.kycExpedienteId, doc, 'RECHAZADO')"
                  >
                    Rechazar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="dictamen-panel" *ngIf="puedeDictaminar(); else avisoSoloCompliance">
            <h3>Emitir Dictamen Final (Exclusivo Compliance)</h3>
            <div class="toolbar-group">
              <input
                type="text"
                [(ngModel)]="observacionDictamen"
                placeholder="Observación del dictamen (obligatoria para RECHAZADO)"
                [disabled]="esFinal(exp.estado)"
              />
              <button
                type="button"
                class="btn-success"
                [disabled]="esFinal(exp.estado)"
                (click)="emitirDictamen(exp.kycExpedienteId, 'VALIDADO')"
              >
                Dictaminar VALIDADO
              </button>
              <button
                type="button"
                class="btn-danger"
                [disabled]="esFinal(exp.estado)"
                (click)="emitirDictamen(exp.kycExpedienteId, 'RECHAZADO')"
              >
                Dictaminar RECHAZADO
              </button>
            </div>
          </div>

          <ng-template #avisoSoloCompliance>
            <p class="compliance-notice">
              Solo el rol <strong>Compliance</strong> puede validar documentos y emitir el
              dictamen final del expediente.
            </p>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .kyc-container { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
      .page-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .subtitle { color: #555; margin: 0.25rem 0 0; }
      .toolbar-card, .card { background: #fff; border: 1px solid #dce1e7; border-radius: 8px; padding: 1rem; }
      .toolbar-card { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
      .toolbar-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
      .grid-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1rem; }
      .data-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
      .data-table th, .data-table td { border-bottom: 1px solid #eee; padding: 0.5rem; text-align: left; font-size: 0.9rem; }
      .selected { background: #f0f6ff; }
      .badge { padding: 0.35rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
      .badge-compliance { background: #e6f4ea; color: #137333; }
      .badge-freelance { background: #e8f0fe; color: #1967d2; }
      .status-pill { padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.8rem; background: #eee; }
      .sla-expired { color: #c5221f; font-weight: 700; }
      .actions-cell { display: flex; gap: 0.35rem; flex-wrap: wrap; }
      .btn-primary, .btn-secondary, .btn-success, .btn-danger, .btn-link { padding: 0.35rem 0.65rem; border-radius: 4px; border: 1px solid transparent; cursor: pointer; font-size: 0.85rem; }
      .btn-primary { background: #0a6ed1; color: #fff; }
      .btn-secondary { background: #f3f4f6; border-color: #d1d5db; color: #111; }
      .btn-success { background: #107e3e; color: #fff; }
      .btn-danger { background: #bb0000; color: #fff; }
      .btn-link { background: transparent; color: #0a6ed1; text-decoration: underline; }
      .alert { padding: 0.6rem 0.9rem; border-radius: 6px; margin: 0; }
      .alert-info { background: #e8f0fe; color: #174ea6; }
      .alert-error { background: #fce8e6; color: #c5221f; }
      .dictamen-panel { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; }
      .compliance-notice { margin-top: 1rem; color: #5f6368; font-style: italic; }
    `,
  ],
})
export class KycPageComponent implements OnInit {
  expedientes = signal<ExpedienteKycResumen[]>([]);
  detalle = signal<ExpedienteKycDetalle | null>(null);
  puedeDictaminar = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  filtroEstado = '';
  nuevaOportunidadId: number | null = null;
  observacionDictamen = '';
  archivosPorCodigo: Record<string, string> = {};

  constructor(
    private kycService: KycService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    const roles = (await this.authService.getRoles()).map((r) => r.toLowerCase());
    this.puedeDictaminar.set(
      ROLES_KYC_DICTAMEN.some((r) => roles.includes(r.toLowerCase())),
    );
    this.cargarExpedientes();
  }

  esFinal(estado: string): boolean {
    return estado === 'VALIDADO' || estado === 'RECHAZADO';
  }

  cargarExpedientes() {
    this.error.set(null);
    this.kycService.listarExpedientes(this.filtroEstado || undefined).subscribe({
      next: (res) => {
        this.expedientes.set(res.items);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error consultando expedientes KYC');
      },
    });
  }

  seleccionarExpediente(expedienteId: number) {
    this.error.set(null);
    this.kycService.obtenerExpediente(expedienteId).subscribe({
      next: (exp) => {
        this.detalle.set(exp);
        this.archivosPorCodigo = {};
        for (const d of exp.documentos) {
          this.archivosPorCodigo[d.codigo] =
            d.archivoReferencia || `https://repositorio.maziflow.local/${d.codigo}.pdf`;
        }
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo cargar el expediente');
      },
    });
  }

  crearExpediente() {
    if (!this.nuevaOportunidadId || this.nuevaOportunidadId <= 0) {
      this.error.set('Ingrese un ID de oportunidad válido');
      return;
    }
    this.error.set(null);
    this.mensaje.set(null);

    this.kycService.crearExpediente(this.nuevaOportunidadId).subscribe({
      next: (creado) => {
        this.mensaje.set(`Expediente KYC #${creado.kycExpedienteId} creado`);
        this.detalle.set(creado);
        this.cargarExpedientes();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo crear el expediente KYC');
      },
    });
  }

  cargarDocumento(expedienteId: number, doc: KycDocumento) {
    const referencia =
      (this.archivosPorCodigo[doc.codigo] || '').trim() ||
      `https://repositorio.maziflow.local/${doc.codigo}.pdf`;

    this.error.set(null);
    this.kycService
      .registrarRecepcion(expedienteId, {
        documentoRequeridoCodigo: doc.codigo,
        archivoReferencia: referencia,
      })
      .subscribe({
        next: () => {
          this.mensaje.set(`Documento ${doc.codigo} recibido`);
          this.seleccionarExpediente(expedienteId);
          this.cargarExpedientes();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error al registrar recepción');
        },
      });
  }

  revisarDocumento(
    expedienteId: number,
    doc: KycDocumento,
    estado: 'VALIDADO' | 'RECHAZADO',
  ) {
    this.error.set(null);
    this.kycService
      .revisarDocumento(expedienteId, doc.kycDocumentoId, {
        estado,
        observacion:
          estado === 'RECHAZADO' ? 'Observado por Compliance' : 'Verificado por Compliance',
      })
      .subscribe({
        next: () => {
          this.mensaje.set(`Documento ${doc.codigo} marcado como ${estado}`);
          this.seleccionarExpediente(expedienteId);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error al revisar documento');
        },
      });
  }

  emitirDictamen(expedienteId: number, estado: 'VALIDADO' | 'RECHAZADO') {
    this.error.set(null);
    this.kycService
      .dictaminar(expedienteId, {
        estado,
        observacion:
          this.observacionDictamen.trim() ||
          (estado === 'RECHAZADO' ? 'Observado por Compliance' : undefined),
      })
      .subscribe({
        next: (actualizado) => {
          this.mensaje.set(
            `Dictamen ${actualizado.estado} emitido sobre el expediente #${expedienteId}`,
          );
          this.detalle.set(actualizado);
          this.cargarExpedientes();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo emitir el dictamen');
        },
      });
  }
}
