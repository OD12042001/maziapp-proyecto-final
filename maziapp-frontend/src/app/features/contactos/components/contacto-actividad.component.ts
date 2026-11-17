import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ButtonModule } from '@fundamental-ngx/core/button';
import { TableModule } from '@fundamental-ngx/core/table';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { IconModule } from '@fundamental-ngx/core/icon';
import { FormModule } from '@fundamental-ngx/core/form';
import { SelectModule } from '@fundamental-ngx/core/select';
import { BarModule } from '@fundamental-ngx/core/bar';
import { ComboboxModule, ComboboxItem } from '@fundamental-ngx/core/combobox';
import { DialogService } from '@fundamental-ngx/core/dialog';

import { ContactosService } from '../../../core/services/contactos.service';
import { CiiuService } from '../../../core/services/ciiu.service';
import { GradoInstruccion, Ciiu, TrabajoDependiente, ActividadNaturalInput } from '../interfaces/actividad.interface';
import {
  TrabajoDependienteModalComponent,
  TrabajoDependienteModalData,
} from './trabajo-dependiente-modal.component';

/**
 * Fase Actividad -- pestaña "Actividad" de la Ficha Contacto. Mismo
 * criterio de aislamiento que `ContactoDireccionesComponent`/
 * `ContactoRepresentantesComponent`: componente hijo DEDICADO, con su
 * propio estado de carga/guardado -- `contacto-ficha.component.ts` NO
 * tiene ninguna lógica de Actividad, y guardar esta pestaña nunca
 * afecta el estado de Cliente/Ubicación/Representantes (ni viceversa).
 * No existe ningún botón "Guardar toda la Ficha".
 *
 * 🔐 NATURAL vs JURIDICA -- este componente SOLO recibe `contactoId`
 * (mismo API mínima que ContactoDireccionesComponent). Deliberadamente
 * NO recibe `tipoContacto` como @Input: en el momento en que
 * `contacto-ficha.component.ts` dispara el `[contactoId]` real (tras
 * resolver el parámetro de ruta), el objeto `contacto` completo
 * (incluyendo `tipoContacto`) todavía puede no haber terminado de
 * cargar (loading en paralelo) -- confiar en ese Input arriesgaría
 * mostrar la rama NATURAL por defecto para un contacto JURIDICA
 * durante una fracción de segundo. En su lugar, `tipoContacto` se
 * resuelve ÚNICAMENTE a partir de la respuesta real de
 * `GET /api/contactos/{id}/actividad` (que el Backend ya calcula
 * consultando `dbo.Contactos` -- ver contactoActividad.service.ts) --
 * nunca se supone ni se muestra ninguna rama hasta tener ese dato.
 *
 * 💾 Guardado explícito -- un único botón "Guardar" para Actividad
 * (Grado de instrucción/Profesión para NATURAL, CIIU para JURIDICA),
 * sin autoguardado, sin guardado al cambiar de pestaña, sin guardado
 * al perder foco.
 *
 * 🔐 ETAPA 5 (arquitectura independiente de Trabajos Dependientes,
 * continuación de las Etapas 2/3/4): Trabajos Dependientes YA NO viaja
 * dentro del PATCH de Actividad -- es un recurso HTTP independiente
 * (`obtenerTrabajosDependientes`/`crearTrabajoDependiente`/
 * `actualizarTrabajoDependiente`/`desactivarTrabajoDependiente`, ver
 * contactos.service.ts), con su propia carga (`cargarTrabajos`) y su
 * propio estado de carga (`cargandoTrabajos`), exactamente igual que
 * `ContactoDireccionesComponent` -- mismo patrón: el modal
 * (`TrabajoDependienteModalComponent`, ver Etapa 4) hace el POST/PATCH
 * por su cuenta y cierra con `true` únicamente tras un guardado
 * exitoso; este componente solo RECARGA desde el Backend cuando eso
 * ocurre -- nunca asume el resultado ni lo escribe en memoria como
 * sustituto de la persistencia real. `guardar()` (Actividad) y las
 * acciones de Trabajos Dependientes (agregar/editar/eliminar) son dos
 * flujos completamente independientes -- ninguno depende del otro.
 */
interface ErroresActividad {
  gradoInstruccion?: string;
  profesionOcupacion?: string;
  ciiu?: string;
}

@Component({
  selector: 'app-contacto-actividad',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TableModule,
    BusyIndicatorModule,
    IconModule,
    FormModule,
    SelectModule,
    BarModule,
    ComboboxModule,
  ],

  templateUrl: './contacto-actividad.component.html',

  styleUrls: ['./contacto-actividad.component.scss'],
})
export class ContactoActividadComponent implements OnChanges, OnDestroy {
  @Input() contactoId = '';

  // 🔐 `null` mientras no se resolvió todavía contra el Backend --
  // ver nota de clase. La plantilla no muestra NINGUNA rama
  // (NATURAL/JURIDICA) hasta que esto tenga un valor real.
  tipoContacto: 'NATURAL' | 'JURIDICA' | null = null;

  cargando = false;
  guardando = false;
  mensaje: { tipo: 'exito' | 'error'; texto: string } | null = null;
  errores: ErroresActividad = {};

  // NATURAL
  gradoInstruccion: GradoInstruccion | null = null;
  profesionOcupacion = '';
  readonly gradosInstruccion: GradoInstruccion[] = ['TECNICO', 'SUPERIOR'];

  // 💼 Trabajos dependientes -- lista PERSISTIDA, releída directamente
  // desde el Backend (nunca combinada con estado en memoria -- ver
  // nota de clase). Única fuente de verdad: `cargarTrabajos()`.
  trabajos: TrabajoDependiente[] = [];
  cargandoTrabajos = false;
  errorTrabajos = '';

  // JURIDICA
  ciiuSeleccionado: Ciiu | null = null;
  ciiuEncontrados: Ciiu[] = [];
  buscandoCiiu = false;

  private busquedaCiiu$ = new Subject<string>();

  constructor(
    private contactosService: ContactosService,
    private ciiuService: CiiuService,
    private dialogService: DialogService,
    // 📌 Mismo patrón que el resto de la Ficha Contacto: sin zone.js
    // activo, la vista solo se actualiza sola cuando el usuario
    // interactúa con algo más en la pantalla.
    private cdr: ChangeDetectorRef,
  ) {
    this.busquedaCiiu$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => this.ejecutarBusquedaCiiu(texto));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contactoId'] && this.contactoId) {
      this.cargarActividad();
    }
  }

  ngOnDestroy(): void {
    this.busquedaCiiu$.complete();
  }

  private cargarActividad(): void {
    this.cargando = true;
    this.mensaje = null;
    this.errores = {};

    // 🔐 Cualquier estado de Trabajos Dependientes de una carga
    // anterior (por ejemplo, si el componente se reutilizara para otro
    // contacto) se descarta -- nunca se muestra el de un contacto
    // distinto mientras se resuelve el nuevo `GET /trabajos-dependientes`.
    this.trabajos = [];
    this.errorTrabajos = '';

    this.contactosService.obtenerActividad(this.contactoId).subscribe({
      next: (data) => {
        this.tipoContacto = data.tipoContacto;
        this.gradoInstruccion = (data.actividad?.gradoInstruccion as GradoInstruccion) ?? null;
        this.profesionOcupacion = data.actividad?.profesionOcupacion ?? '';

        this.ciiuSeleccionado =
          data.actividad?.ciiuId && data.actividad?.ciiuCodigo
            ? {
                ciiuId: data.actividad.ciiuId,
                codigo: data.actividad.ciiuCodigo,
                descripcion: data.actividad.ciiuDescripcion ?? '',
              }
            : null;

        this.cargando = false;
        this.cdr.detectChanges();

        // 💼 Trabajos Dependientes corresponde únicamente a NATURAL
        // (ver nota de clase) -- para JURIDICA `this.trabajos` queda
        // en `[]` (ya reiniciado arriba), sin disparar ningún GET.
        if (this.tipoContacto === 'NATURAL') {
          this.cargarTrabajos();
        }
      },

      error: (err) => {
        console.error('Error cargando actividad del contacto', { status: err?.status });
        this.cargando = false;
        this.mensaje = {
          tipo: 'error',
          texto: 'No fue posible cargar la información de Actividad.',
        };
        this.cdr.detectChanges();
      },
    });
  }

  // 📋 Trabajos dependientes -- fuente de verdad exclusiva:
  // `GET /api/contactos/{contactoId}/trabajos-dependientes` (mismo
  // patrón que `ContactoDireccionesComponent::cargarDirecciones`,
  // incluido el mismo experimento NG0100 documentado ahí: diferir un
  // microtask la transición `false -> true` de `cargandoTrabajos`).
  private cargarTrabajos(): void {
    queueMicrotask(() => {
      this.cargandoTrabajos = true;
      this.cdr.markForCheck();
    });

    this.contactosService.obtenerTrabajosDependientes(this.contactoId).subscribe({
      next: (data) => {
        this.trabajos = data;
        this.cargandoTrabajos = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error cargando trabajos dependientes', { status: err?.status });
        this.cargandoTrabajos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ➕ Abre el modal "Trabajo dependiente" en modo alta (botón "+").
  agregarTrabajo(): void {
    this.abrirModalTrabajo(null);
  }

  // ✏️ Abre el modal "Trabajo dependiente" en modo edición, precargado
  // con la fila seleccionada.
  editarTrabajo(trabajo: TrabajoDependiente): void {
    this.abrirModalTrabajo(trabajo);
  }

  private abrirModalTrabajo(trabajo: TrabajoDependiente | null): void {
    // 🔐 Nunca abrir el modal sin `contactoId` -- en la práctica esta
    // rama de la plantilla no es visible hasta que `cargarActividad()`
    // ya resolvió un `contactoId` real (ver `ngOnChanges`), pero se
    // deja esta guarda explícita como red de seguridad.
    if (!this.contactoId) {
      return;
    }

    this.errorTrabajos = '';

    const data: TrabajoDependienteModalData = { contactoId: this.contactoId, trabajo };

    const dialogRef = this.dialogService.open(TrabajoDependienteModalComponent, {
      responsivePadding: true,
      mobile: false,
      data,
    });

    // 🔄 El modal (Etapa 4) cierra con `true` únicamente tras un
    // POST/PATCH exitoso -- un `false`/`undefined` (Cancelar, cierre
    // con Escape/backdrop, o un error que mantiene el modal abierto)
    // nunca dispara ningún refresco. Mismo criterio que
    // `ContactoDireccionesComponent::abrirModal`.
    dialogRef.afterClosed.subscribe((resultado) => {
      if (resultado) {
        this.cargarTrabajos();
      }
    });
  }

  // ➖ Desactiva (baja lógica) un Trabajo dependiente -- requiere
  // confirmación explícita antes de ejecutar la baja, mismo criterio
  // que `ContactoDireccionesComponent::desactivarDireccion` (incluido
  // el uso de `window.confirm`, sin introducir un componente de
  // diálogo de confirmación nuevo).
  desactivarTrabajo(trabajo: TrabajoDependiente): void {
    const confirmado = window.confirm(
      `¿Desactivar el trabajo dependiente en ${trabajo.empresa.nombre} (${trabajo.cargo})?`,
    );

    if (!confirmado) {
      return;
    }

    this.errorTrabajos = '';

    this.contactosService.desactivarTrabajoDependiente(this.contactoId, trabajo.id).subscribe({
      next: () => {
        this.cargarTrabajos();
      },

      error: (err) => {
        console.error('Error desactivando trabajo dependiente', { status: err?.status });

        this.errorTrabajos =
          err?.status === 401 || err?.status === 403
            ? 'No tienes autorización para realizar esta acción.'
            : 'No fue posible desactivar el trabajo dependiente. Inténtalo nuevamente.';

        this.cdr.detectChanges();
      },
    });
  }

  // 🔍 CIIU -- mismo patrón exacto que DireccionModalComponent
  // (Distrito): communicateByObject=true, exige seleccionar un valor
  // real del catálogo (a diferencia de Empresa, CIIU no admite texto
  // libre).
  onCiiuInputChange(texto: string): void {
    this.busquedaCiiu$.next(texto ?? '');
  }

  private ejecutarBusquedaCiiu(texto: string): void {
    const limpio = texto.trim();

    if (limpio.length < 2) {
      this.ciiuEncontrados = [];
      this.buscandoCiiu = false;
      this.cdr.detectChanges();
      return;
    }

    this.buscandoCiiu = true;
    this.cdr.detectChanges();

    this.ciiuService.buscarCiiu(limpio).subscribe({
      next: (resultados) => {
        this.ciiuEncontrados = resultados;
        this.buscandoCiiu = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error buscando CIIU', { status: err?.status });
        this.ciiuEncontrados = [];
        this.buscandoCiiu = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatearCiiu = (item: Ciiu | null | undefined): string =>
    item ? `${item.codigo} - ${item.descripcion}` : '';

  filtroCiiu = (items: Ciiu[]): Ciiu[] => items;

  private validar(): boolean {
    this.errores = {};
    let valido = true;

    if (this.tipoContacto === 'NATURAL') {
      if (!this.gradoInstruccion) {
        this.errores.gradoInstruccion = 'Grado de instrucción es requerido.';
        valido = false;
      }

      if (!this.profesionOcupacion.trim()) {
        this.errores.profesionOcupacion = 'Profesión/Ocupación es requerida.';
        valido = false;
      }
    } else if (this.tipoContacto === 'JURIDICA') {
      if (!this.ciiuSeleccionado) {
        this.errores.ciiu = 'Selecciona un CIIU válido.';
        valido = false;
      }
    }

    return valido;
  }

  // 💾 Guarda ÚNICAMENTE los datos propios de Actividad -- NATURAL:
  // gradoInstruccion + profesionOcupacion; JURIDICA: ciiuId. Desde la
  // Etapa 5, este método NUNCA envía nada relacionado a Trabajos
  // Dependientes (ni `trabajosNuevos` ni ningún otro campo) -- ver
  // nota de clase y `ActividadNaturalInput` (interfaces/actividad.interface.ts),
  // que ya no declara ese campo.
  guardar(): void {
    if (this.guardando || !this.tipoContacto) {
      return;
    }

    this.mensaje = null;

    if (!this.validar()) {
      this.cdr.detectChanges();
      return;
    }

    this.guardando = true;

    const request =
      this.tipoContacto === 'NATURAL'
        ? this.contactosService.guardarActividadNatural(this.contactoId, {
            gradoInstruccion: this.gradoInstruccion!,
            profesionOcupacion: this.profesionOcupacion.trim(),
          } as ActividadNaturalInput)
        : this.contactosService.guardarActividadJuridica(this.contactoId, {
            ciiuId: this.ciiuSeleccionado!.ciiuId,
          });

    request.subscribe({
      next: () => {
        this.guardando = false;
        this.mensaje = { tipo: 'exito', texto: 'Actividad guardada correctamente.' };
        this.cdr.detectChanges();
      },

      error: (err) => {
        this.guardando = false;

        console.error('Error guardando actividad', { status: err?.status, message: err?.error?.message });

        if (err?.status === 401 || err?.status === 403) {
          this.mensaje = {
            tipo: 'error',
            texto: 'No tienes autorización para realizar esta acción.',
          };
        } else if (err?.status === 404) {
          this.mensaje = { tipo: 'error', texto: 'El contacto no fue encontrado.' };
        } else if (err?.status === 400 && err?.error?.errors?.fieldErrors) {
          const fieldErrors = err.error.errors.fieldErrors as Record<string, string[]>;

          this.errores = {
            gradoInstruccion: fieldErrors['gradoInstruccion']?.[0],
            profesionOcupacion: fieldErrors['profesionOcupacion']?.[0],
            ciiu: fieldErrors['ciiuId']?.[0],
          };

          const hayErroresPorCampo = Object.values(this.errores).some(Boolean);

          this.mensaje = hayErroresPorCampo
            ? null
            : { tipo: 'error', texto: err?.error?.message || 'Datos de actividad inválidos.' };
        } else if (err?.status === 400) {
          // ActividadCiiuInvalidoError / ActividadTipoIncorrectoError --
          // mensaje seguro devuelto directamente por el Backend.
          this.mensaje = {
            tipo: 'error',
            texto: err?.error?.message || 'No fue posible guardar la actividad.',
          };
        } else {
          this.mensaje = {
            tipo: 'error',
            texto: 'No fue posible guardar la actividad. Inténtalo nuevamente.',
          };
        }

        this.cdr.detectChanges();
      },
    });
  }
}
