import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';

import { ButtonModule } from '@fundamental-ngx/core/button';
import { TableModule } from '@fundamental-ngx/core/table';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { IconModule } from '@fundamental-ngx/core/icon';
import { DialogService } from '@fundamental-ngx/core/dialog';

import { ContactosService } from '../../../core/services/contactos.service';
import { Representante } from '../interfaces/representante.interface';
import { RepresentanteModalComponent, RepresentanteModalData } from './representante-modal.component';

/**
 * Fase Representantes (Edición) -- componente hijo DEDICADO (mismo
 * criterio que `ContactoDireccionesComponent`, decisión 6 de la Fase
 * Representantes original): `contacto-ficha.component.html` solo
 * integra este componente (`[contactoId]="contactoId"`), sin lógica de
 * Representantes en `contacto-ficha.component.ts`.
 *
 * REESCRITO en esta fase (pedido explícito del usuario): el formulario
 * de alta siempre visible bajo la tabla se reemplaza por un botón "+"
 * que abre un MODAL ("Representante", alta y edición) -- mismo patrón
 * exacto que `ContactoDireccionesComponent`/`DireccionModalComponent`
 * (`DialogService.open`), elegido explícitamente por el usuario para
 * esta fase ("parecido a como está en la pestaña 'Ubicación'"). La
 * columna de texto "Desactivar" se reemplaza por los mismos iconos
 * Editar/Desactivar (mismo tamaño/estilo/espaciado/comportamiento) que
 * ya usa `ContactoDireccionesComponent`.
 *
 * El Backend es la única autoridad real de ownership/JURIDICA/
 * duplicados (`representante.service.ts`) -- la validación de este
 * componente/del modal es solo UX mínima.
 *
 * 🔐 CRÍTICO (restricción explícita del usuario, preservada sin
 * cambios en esta reescritura): un representante puede estar asociado
 * a VARIAS empresas. Este componente nunca asume lo contrario --
 * "Editar" abre el modal con los datos de ESTE representante para
 * editarlos (lo que, por diseño ya explicado y aceptado por el usuario
 * en representante.service.ts::actualizarRepresentante, actualiza el
 * registro global de la persona en todas las empresas donde es
 * representante), y "Desactivar" (mismo endpoint DELETE ya existente,
 * sin cambios) solo desactiva la relación de ESTA empresa con este
 * representante -- nunca borra ni afecta al representante global ni a
 * sus relaciones con otras empresas.
 */
@Component({
  selector: 'app-contacto-representantes',

  standalone: true,

  imports: [CommonModule, ButtonModule, TableModule, BusyIndicatorModule, IconModule],

  templateUrl: './contacto-representantes.component.html',

  styleUrls: ['./contacto-representantes.component.scss'],
})
export class ContactoRepresentantesComponent implements OnChanges {
  @Input() contactoId = '';

  representantes: Representante[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private contactosService: ContactosService,

    private dialogService: DialogService,

    // 📌 Mismo patrón ya usado en contacto-direcciones.component.ts/
    // contacto-modal.component.ts: el proyecto no tiene zone.js activo,
    // así que la vista solo se actualiza sola cuando el usuario
    // interactúa con algo más en la pantalla.
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contactoId'] && this.contactoId) {
      this.cargarRepresentantes();
    }
  }

  cargarRepresentantes(): void {
    // 🔧 Correccion NG0100 -- mismo patron ya confirmado en
    // contacto-direcciones.component.ts::cargarDirecciones(): diferir
    // un microtask la transicion false -> true de `loading` evita el
    // ExpressionChangedAfterItHasBeenCheckedError al agregar/editar un
    // representante. Ver mazi-engineering-debugging.
    queueMicrotask(() => {
      this.loading = true;
      this.cdr.markForCheck();
    });

    this.contactosService.obtenerRepresentantes(this.contactoId).subscribe({
      next: (data) => {
        this.representantes = data;
        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error cargando representantes', { status: err?.status });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ➕ Abre el modal "Representante" en modo alta (botón "+").
  agregarRepresentante(): void {
    this.abrirModal(null);
  }

  // ✏️ Abre el modal "Representante" en modo edición, precargado con la
  // fila seleccionada.
  editarRepresentante(representante: Representante): void {
    this.abrirModal(representante);
  }

  private abrirModal(representante: Representante | null): void {
    this.errorMessage = '';

    const data: RepresentanteModalData = { contactoId: this.contactoId, representante };

    const dialogRef = this.dialogService.open(RepresentanteModalComponent, {
      responsivePadding: true,
      mobile: false,
      data,
    });

    // 🔄 El modal cierra con `true` únicamente tras un guardado exitoso
    // (ver representante-modal.component.ts::guardar()) -- un
    // `false`/`undefined` (Cancelar, cierre con Escape/backdrop) no
    // dispara ningún refresco, mismo criterio que
    // contacto-direcciones.component.ts al refrescar la lista de
    // Direcciones.
    dialogRef.afterClosed.subscribe((resultado) => {
      if (resultado) {
        this.cargarRepresentantes();
      }
    });
  }

  // ➖ Desactiva (soft delete) la relación entre esta empresa y un
  // representante -- requiere confirmación explícita antes de ejecutar
  // la baja (mismo comportamiento que
  // contacto-direcciones.component.ts::desactivarDireccion, pedido
  // explícito del usuario para esta fase: "el mismo concepto y
  // comportamiento que actualmente utiliza Direcciones"). Antes de esta
  // reescritura, esta baja NO pedía confirmación -- se agrega aquí para
  // igualar el comportamiento, sin introducir una librería o patrón de
  // UI nuevo (mismo `window.confirm` ya usado en Direcciones).
  desactivarRepresentante(representante: Representante): void {
    const confirmado = window.confirm(
      `¿Desactivar a ${representante.nombres} ${representante.apellidos} como representante de esta empresa?`,
    );

    if (!confirmado) {
      return;
    }

    this.errorMessage = '';

    this.contactosService
      .desactivarRepresentante(this.contactoId, representante.representanteId)
      .subscribe({
        next: () => {
          this.cargarRepresentantes();
        },

        error: (err) => {
          console.error('Error desactivando representante', { status: err?.status });

          this.errorMessage =
            err?.status === 401 || err?.status === 403
              ? 'No tienes autorización para realizar esta acción.'
              : 'No fue posible desactivar al representante. Inténtalo nuevamente.';

          this.cdr.detectChanges();
        },
      });
  }
}
