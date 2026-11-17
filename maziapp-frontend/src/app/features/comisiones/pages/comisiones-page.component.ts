import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ROLES_COMISIONES_REVERSION } from '../../../core/auth/app-roles';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CierreInversion,
  Comision,
  ComisionesService,
} from '../../../core/services/comisiones.service';

@Component({
  selector: 'app-comisiones-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="comisiones-container">
      <header class="page-header">
        <div>
          <h1>Cierres de Inversión y Comisiones (S15 / S16 / S17)</h1>
          <p class="subtitle">
            Registro idempotente de cierres, cálculo de comisión (3 % incluido IGV 18 %) vía ESB y reversión auditada
          </p>
        </div>
        <button type="button" class="btn-primary" (click)="despacharOutbox()">
          Despachar Outbox ESB (Calcular Comisiones S16)
        </button>
      </header>

      <p *ngIf="mensaje()" class="alert alert-info">{{ mensaje() }}</p>
      <p *ngIf="error()" class="alert alert-error">{{ error() }}</p>

      <section class="card">
        <h2>Registrar Cierre de Inversión (S15)</h2>
        <form class="form-row" (ngSubmit)="registrarCierre()">
          <label>
            Oportunidad ID:
            <input
              type="number"
              min="1"
              [(ngModel)]="nuevoCierre.oportunidadId"
              name="oportunidadId"
              required
            />
          </label>
          <label>
            Proyecto ID:
            <input
              type="number"
              min="1"
              [(ngModel)]="nuevoCierre.proyectoId"
              name="proyectoId"
              required
            />
          </label>
          <label>
            Monto Captado:
            <input
              type="number"
              min="1"
              step="0.01"
              [(ngModel)]="nuevoCierre.montoCaptado"
              name="montoCaptado"
              required
            />
          </label>
          <label>
            Moneda:
            <select [(ngModel)]="nuevoCierre.monedaCodigo" name="monedaCodigo">
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            Idempotency-Key:
            <input
              type="text"
              [(ngModel)]="nuevoCierre.idempotencyKey"
              name="idempotencyKey"
              required
            />
          </label>
          <button type="submit" class="btn-primary">Registrar Cierre</button>
        </form>
      </section>

      <div class="grid-layout">
        <section class="card">
          <h2>Cierres Registrados ({{ cierres().length }})</h2>
          <table class="data-table" *ngIf="cierres().length > 0; else sinCierres">
            <thead>
              <tr>
                <th>Cierre</th>
                <th>Oportunidad</th>
                <th>Proyecto</th>
                <th>Monto Captado</th>
                <th>Estado Cierre</th>
                <th>Comisión S16</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let c of cierres()">
                <td>#{{ c.cierreId }}</td>
                <td>Op. #{{ c.oportunidadId }}</td>
                <td>{{ c.proyecto.codigo }} — {{ c.proyecto.nombre }}</td>
                <td>{{ c.monedaCodigo }} {{ c.montoCaptado | number: '1.2-2' }}</td>
                <td><span class="status-pill">{{ c.estado }}</span></td>
                <td>
                  <span *ngIf="c.comisionId; else pendienteEsb">
                    #{{ c.comisionId }} ({{ c.comisionEstado }})
                  </span>
                  <ng-template #pendienteEsb>
                    <em class="muted">En cola Outbox ESB</em>
                  </ng-template>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #sinCierres>
            <p class="empty-state">No hay cierres registrados.</p>
          </ng-template>
        </section>

        <section class="card">
          <div class="section-header">
            <h2>Comisiones Calculadas — S16 ({{ comisiones().length }})</h2>
            <select [(ngModel)]="filtroEstadoComision" (change)="cargarDatos()">
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="LIQUIDADA">LIQUIDADA</option>
              <option value="REVERTIDA">REVERTIDA</option>
            </select>
          </div>

          <table class="data-table" *ngIf="comisiones().length > 0; else sinComisiones">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cierre / Op.</th>
                <th>Monto Captado</th>
                <th>Total (3 %)</th>
                <th>Base Imponible</th>
                <th>IGV (18 %)</th>
                <th>Estado</th>
                <th>Reversión (S17)</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of comisiones()">
                <td>#{{ m.comisionId }}</td>
                <td>Cierre #{{ m.cierreId }} (Op. #{{ m.oportunidadId }})</td>
                <td>{{ m.monedaCodigo }} {{ m.montoCaptado | number: '1.2-2' }}</td>
                <td><strong>{{ m.monedaCodigo }} {{ m.importeTotal | number: '1.2-2' }}</strong></td>
                <td>{{ m.monedaCodigo }} {{ m.baseImponible | number: '1.2-2' }}</td>
                <td>{{ m.monedaCodigo }} {{ m.importeIgv | number: '1.2-2' }}</td>
                <td><span class="status-pill">{{ m.estado }}</span></td>
                <td>
                  <span *ngIf="m.reversion">
                    {{ m.reversion.motivoCodigo }}
                  </span>
                  <div
                    *ngIf="!m.reversion && m.estado === 'PENDIENTE' && puedeRevertir()"
                    class="reversion-actions"
                  >
                    <select [(ngModel)]="motivosPorComision[m.comisionId]">
                      <option value="DESEMBOLSO_NO_CONCRETADO">
                        DESEMBOLSO_NO_CONCRETADO
                      </option>
                      <option value="KYC_RECHAZADO">KYC_RECHAZADO</option>
                    </select>
                    <button
                      type="button"
                      class="btn-danger"
                      (click)="revertir(m)"
                    >
                      Revertir
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <ng-template #sinComisiones>
            <p class="empty-state">No hay comisiones calculadas para el filtro actual.</p>
          </ng-template>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .comisiones-container { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
      .page-header, .section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
      .subtitle { color: #555; margin: 0.25rem 0 0; }
      .card { background: #fff; border: 1px solid #dce1e7; border-radius: 8px; padding: 1rem; }
      .form-row { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-top: 0.5rem; }
      .form-row label { display: flex; flex-direction: column; font-size: 0.85rem; gap: 0.25rem; }
      .grid-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 1rem; }
      .data-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
      .data-table th, .data-table td { border-bottom: 1px solid #eee; padding: 0.5rem; text-align: left; font-size: 0.9rem; }
      .status-pill { padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.8rem; background: #eee; }
      .reversion-actions { display: flex; gap: 0.35rem; align-items: center; }
      .btn-primary, .btn-danger { padding: 0.4rem 0.75rem; border-radius: 4px; border: none; cursor: pointer; font-size: 0.85rem; }
      .btn-primary { background: #0a6ed1; color: #fff; }
      .btn-danger { background: #bb0000; color: #fff; }
      .alert { padding: 0.6rem 0.9rem; border-radius: 6px; margin: 0; }
      .alert-info { background: #e8f0fe; color: #174ea6; }
      .alert-error { background: #fce8e6; color: #c5221f; }
      .muted { color: #6b7280; }
    `,
  ],
})
export class ComisionesPageComponent implements OnInit {
  cierres = signal<CierreInversion[]>([]);
  comisiones = signal<Comision[]>([]);
  puedeRevertir = signal<boolean>(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  filtroEstadoComision = '';
  motivosPorComision: Record<
    number,
    'KYC_RECHAZADO' | 'DESEMBOLSO_NO_CONCRETADO'
  > = {};

  nuevoCierre = {
    oportunidadId: 1,
    proyectoId: 1,
    montoCaptado: 200000,
    monedaCodigo: 'PEN' as 'PEN' | 'USD',
    idempotencyKey: `idem-cierre-${Date.now()}`,
  };

  constructor(
    private comisionesService: ComisionesService,
    private authService: AuthService,
  ) {}

  async ngOnInit() {
    const roles = (await this.authService.getRoles()).map((r) => r.toLowerCase());
    this.puedeRevertir.set(
      ROLES_COMISIONES_REVERSION.some((r) => roles.includes(r.toLowerCase())),
    );
    this.cargarDatos();
  }

  cargarDatos() {
    this.error.set(null);

    this.comisionesService.listarCierres().subscribe({
      next: (res) => this.cierres.set(res.items),
      error: (err) =>
        this.error.set(err?.error?.message || 'Error consultando cierres'),
    });

    this.comisionesService
      .listarComisiones(this.filtroEstadoComision || undefined)
      .subscribe({
        next: (res) => {
          this.comisiones.set(res.items);
          for (const m of res.items) {
            if (!this.motivosPorComision[m.comisionId]) {
              this.motivosPorComision[m.comisionId] = 'DESEMBOLSO_NO_CONCRETADO';
            }
          }
        },
        error: (err) =>
          this.error.set(err?.error?.message || 'Error consultando comisiones'),
      });
  }

  registrarCierre() {
    this.error.set(null);
    this.mensaje.set(null);

    this.comisionesService
      .registrarCierre(
        {
          oportunidadId: Number(this.nuevoCierre.oportunidadId),
          proyectoId: Number(this.nuevoCierre.proyectoId),
          montoCaptado: Number(this.nuevoCierre.montoCaptado),
          monedaCodigo: this.nuevoCierre.monedaCodigo,
          fechaCierreUtc: new Date().toISOString(),
        },
        this.nuevoCierre.idempotencyKey,
      )
      .subscribe({
        next: (cierre) => {
          this.mensaje.set(
            `Cierre #${cierre.cierreId} registrado. Ejecute "Despachar Outbox ESB" para calcular su comisión S16.`,
          );
          this.nuevoCierre.idempotencyKey = `idem-cierre-${Date.now()}`;
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo registrar el cierre');
        },
      });
  }

  despacharOutbox() {
    this.error.set(null);
    this.comisionesService.procesarOutbox(50).subscribe({
      next: (res) => {
        this.mensaje.set(
          `Outbox procesado: ${res.procesados} mensajes (${res.publicados} publicados, ${res.fallidos} fallidos, ${res.muertos} muertos).`,
        );
        this.cargarDatos();
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error despachando el outbox ESB');
      },
    });
  }

  revertir(comision: Comision) {
    const motivoCodigo =
      this.motivosPorComision[comision.comisionId] || 'DESEMBOLSO_NO_CONCRETADO';
    const idempotencyKey = `idem-rev-${comision.comisionId}-${motivoCodigo}`;

    this.error.set(null);
    this.comisionesService
      .revertirComision(
        comision.comisionId,
        {
          motivoCodigo,
          fechaEvaluacionUtc: new Date().toISOString(),
          observacion: `Reversión registrada desde UI (${motivoCodigo})`,
        },
        idempotencyKey,
      )
      .subscribe({
        next: (actualizada) => {
          this.mensaje.set(
            `Comisión #${actualizada.comisionId} marcada como ${actualizada.estado}`,
          );
          this.cargarDatos();
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo revertir la comisión');
        },
      });
  }
}
