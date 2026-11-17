import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';

import { ButtonModule } from '@fundamental-ngx/core/button';
import { TableModule } from '@fundamental-ngx/core/table';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { IconModule } from '@fundamental-ngx/core/icon';
import { DialogService } from '@fundamental-ngx/core/dialog';

import { ContactosService } from '../../../core/services/contactos.service';
import { Direccion } from '../interfaces/direccion.interface';
import { DireccionModalComponent, DireccionModalData } from './direccion-modal.component';

/**
 * Fase Direcciones -- componente hijo DEDICADO (mismo criterio que
 * `ContactoRepresentantesComponent`, decisión 6 de esa fase):
 * `contacto-ficha.component.html` solo integra este componente
 * (`[contactoId]="contactoId"`), sin lógica de Direcciones en
 * `contacto-ficha.component.ts`. A diferencia de Representantes, este
 * componente se muestra SIEMPRE dentro de la pestaña Ubicación -- sin
 * `*ngIf` por `tipoContacto` -- porque Direcciones aplica tanto a
 * NATURAL como a JURIDICA (decisión confirmada de esta fase).
 *
 * A diferencia de Representantes (formulario siempre visible bajo la
 * tabla), la especificación de esta fase exige un MODAL "Dirección"
 * (alta y edición) abierto mediante un botón "+" -- mismo patrón que
 * `contactos.component.ts` abre `ContactoModalComponent`
 * (`DialogService.open`).
 *
 * El Backend es la única autoridad real de ownership (`obtenerContactoPorId`,
 * reutilizado sin modificar desde `direccion.service.ts`) y de la
 * validez de `idDistrito` -- la validación de este componente/del modal
 * es solo UX mínima.
 */
@Component({
  selector: 'app-contacto-direcciones',

  standalone: true,

  imports: [CommonModule, ButtonModule, TableModule, BusyIndicatorModule, IconModule],

  templateUrl: './contacto-direcciones.component.html',

  styleUrls: ['./contacto-direcciones.component.scss'],
})
export class ContactoDireccionesComponent implements OnChanges {
  @Input() contactoId = '';

  direcciones: Direccion[] = [];

  loading = false;
  errorMessage = '';

  constructor(
    private contactosService: ContactosService,

    private dialogService: DialogService,

    // 📌 Mismo patrón ya usado en contacto-representantes.component.ts
    // /contacto-modal.component.ts: el proyecto no tiene zone.js
    // activo, así que la vista solo se actualiza sola cuando el
    // usuario interactúa con algo más en la pantalla.
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contactoId'] && this.contactoId) {
      this.cargarDirecciones();
    }
  }

  cargarDirecciones(): void {
    // 🧪 Experimento NG0100 -- diferir un microtask la transicion
    // false -> true de `loading` para comprobar si eso elimina el
    // ExpressionChangedAfterItHasBeenCheckedError reportado al
    // guardar una direccion. Ver mazi-engineering-debugging.
    queueMicrotask(() => {
      this.loading = true;
      this.cdr.markForCheck();
    });

    this.contactosService.obtenerDirecciones(this.contactoId).subscribe({
      next: (data) => {
        this.direcciones = data;
        this.loading = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error cargando direcciones', { status: err?.status });
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ➕ Abre el modal "Dirección" en modo alta (botón "+").
  agregarDireccion(): void {
    this.abrirModal(null);
  }

  // ✏️ Abre el modal "Dirección" en modo edición, precargado con la
  // fila seleccionada.
  editarDireccion(direccion: Direccion): void {
    this.abrirModal(direccion);
  }

  private abrirModal(direccion: Direccion | null): void {
    this.errorMessage = '';

    const data: DireccionModalData = { contactoId: this.contactoId, direccion };

    const dialogRef = this.dialogService.open(DireccionModalComponent, {
      responsivePadding: true,
      mobile: false,
      data,
    });

    // 🔄 El modal cierra con `true` únicamente tras un guardado
    // exitoso (ver direccion-modal.component.ts::guardar()) -- un
    // `false`/`undefined` (Cancelar, cierre con Escape/backdrop) no
    // dispara ningún refresco, mismo criterio que
    // contacto-modal.component.ts al refrescar la lista de Contactos.
    dialogRef.afterClosed.subscribe((resultado) => {
      if (resultado) {
        this.cargarDirecciones();
      }
    });
  }

  // ➖ Desactiva (soft delete) una Dirección -- requiere confirmación
  // explícita antes de ejecutar la baja (exigido por la especificación
  // de esta fase). No existe, hoy, ningún componente de diálogo de
  // confirmación ya establecido en el proyecto (ni en
  // contacto-representantes.component.ts, cuya baja no pide
  // confirmación, ni en ningún otro lugar) -- se usa `window.confirm`
  // como mecanismo mínimo y conservador, sin introducir una librería o
  // patrón de UI nuevo; documentado explícitamente en el informe final
  // de esta fase.
  desactivarDireccion(direccion: Direccion): void {
    const confirmado = window.confirm(
      `¿Desactivar la dirección en ${direccion.distrito}, ${direccion.provincia}, ${direccion.departamento} (${direccion.calle} ${direccion.numero})?`,
    );

    if (!confirmado) {
      return;
    }

    this.errorMessage = '';

    this.contactosService.desactivarDireccion(this.contactoId, direccion.idDireccion).subscribe({
      next: () => {
        this.cargarDirecciones();
      },

      error: (err) => {
        console.error('Error desactivando dirección', { status: err?.status });

        this.errorMessage =
          err?.status === 401 || err?.status === 403
            ? 'No tienes autorización para realizar esta acción.'
            : 'No fue posible desactivar la dirección. Inténtalo nuevamente.';

        this.cdr.detectChanges();
      },
    });
  }
}
