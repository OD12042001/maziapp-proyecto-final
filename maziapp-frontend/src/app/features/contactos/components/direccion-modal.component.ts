import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { DialogRef, DialogModule } from '@fundamental-ngx/core/dialog';
import { FormModule } from '@fundamental-ngx/core/form';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { ComboboxModule } from '@fundamental-ngx/core/combobox';

import { ContactosService } from '../../../core/services/contactos.service';
import { UbigeoService } from '../../../core/services/ubigeo.service';
import { Direccion, DireccionInput, Distrito } from '../interfaces/direccion.interface';

/**
 * Fase Direcciones -- modal "Dirección" (alta y edición), abierto vía
 * `DialogService.open(DireccionModalComponent, { data })` desde
 * `contacto-direcciones.component.ts` (mismo patrón que
 * `contactos.component.ts` abre `ContactoModalComponent`).
 *
 * `direccion` presente en `data` = modo edición (precarga Distrito,
 * mostrado como "DISTRITO, PROVINCIA, DEPARTAMENTO" / Calle / Número /
 * Departamento-Interior); ausente/null = modo alta. Un único
 * componente para ambos casos, igual que el modal "Crear contacto"
 * reutiliza un solo formulario para NATURAL/JURIDICA.
 */
export interface DireccionModalData {
  contactoId: string;
  direccion: Direccion | null;
}

interface DireccionFormModel {
  distritoSeleccionado: Distrito | null;
  calle: string;
  numero: string;
  departamentoInterior: string;
}

function modeloVacio(): DireccionFormModel {
  return {
    distritoSeleccionado: null,
    calle: '',
    numero: '',
    departamentoInterior: '',
  };
}

/**
 * Errores por campo del formulario "Dirección" -- mismo patrón que
 * `ErroresCampoContacto` (contacto-error.util.ts) / el modal "Crear
 * contacto": un mensaje debajo de cada input, nunca solo un mensaje
 * genérico al pie cuando el error es de un campo puntual. `distrito`
 * cubre tanto "campo requerido" como "Selecciona un distrito válido."
 * (el mensaje específico exigido cuando el usuario escribe texto sin
 * seleccionar una opción real del autocompletado).
 */
interface ErroresCampoDireccion {
  distrito?: string;
  calle?: string;
  numero?: string;
  departamentoInterior?: string;
}

@Component({
  selector: 'app-direccion-modal',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    FormModule,
    ButtonModule,
    BusyIndicatorModule,
    ComboboxModule,
  ],

  templateUrl: './direccion-modal.component.html',

  styleUrls: ['./direccion-modal.component.scss'],
})
export class DireccionModalComponent implements OnInit, OnDestroy {
  model: DireccionFormModel = modeloVacio();

  distritosEncontrados: Distrito[] = [];
  buscandoDistritos = false;

  guardando = false;
  errorMessage = '';
  errores: ErroresCampoDireccion = {};

  get esEdicion(): boolean {
    return !!this.dialogRef.data?.direccion;
  }

  // 🔍 Autocompletado -- debounce de 300ms antes de golpear el
  // Backend en cada tecla. Separado de `ejecutarBusqueda()` (privado,
  // abajo) para que la lógica de búsqueda en sí sea testeable sin
  // depender de temporizadores reales (mismo criterio del proyecto:
  // "no zone.js", sin fakeAsync/spies de framework en los tests).
  private busqueda$ = new Subject<string>();

  constructor(
    public dialogRef: DialogRef<DireccionModalData>,

    private contactosService: ContactosService,

    private ubigeoService: UbigeoService,

    // 📌 Mismo patrón ya usado en contacto-modal.component.ts /
    // contacto-representantes.component.ts: el proyecto no tiene
    // zone.js activo, así que la vista solo se actualiza sola cuando
    // el usuario interactúa con algo más en la pantalla.
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const direccionExistente = this.dialogRef.data?.direccion;

    if (direccionExistente) {
      // ✏️ Modo edición -- precarga Distrito (mostrado como "DISTRITO,
      // PROVINCIA, DEPARTAMENTO" vía `formatearDistrito` en el
      // template) / Calle / Número / Departamento-Interior. El objeto
      // completo {idDistrito, distrito, provincia, departamento} se
      // conserva como valor del combobox (communicateByObject) -- solo
      // `idDistrito` viaja al Backend al guardar.
      this.model = {
        distritoSeleccionado: {
          idDistrito: direccionExistente.idDistrito,
          distrito: direccionExistente.distrito,
          provincia: direccionExistente.provincia,
          departamento: direccionExistente.departamento,
        },
        calle: direccionExistente.calle,
        numero: direccionExistente.numero,
        departamentoInterior: direccionExistente.departamentoInterior ?? '',
      };

      this.distritosEncontrados = [this.model.distritoSeleccionado as Distrito];
    }

    // debounceTime + distinctUntilChanged: solo se busca cuando el
    // usuario deja de escribir y el texto cambió respecto a la última
    // búsqueda.
    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => this.ejecutarBusqueda(texto));
  }

  ngOnDestroy(): void {
    this.busqueda$.complete();
  }

  onDistritoInputChange(texto: string): void {
    this.busqueda$.next(texto ?? '');
  }

  // 🔍 Búsqueda real contra el Backend (SQL Server, vía
  // ubigeo.repository.ts) -- nunca una lista hardcodeada en el
  // Frontend. Menos de 2 caracteres no dispara la búsqueda (mismo
  // mínimo que exige `ubigeo.validator.ts` en el Backend) y limpia el
  // desplegable.
  private ejecutarBusqueda(texto: string): void {
    const limpio = texto.trim();

    if (limpio.length < 2) {
      this.distritosEncontrados = [];
      this.buscandoDistritos = false;
      this.cdr.detectChanges();
      return;
    }

    this.buscandoDistritos = true;
    this.cdr.detectChanges();

    this.ubigeoService.buscarDistritos(limpio).subscribe({
      next: (distritos) => {
        this.distritosEncontrados = distritos;
        this.buscandoDistritos = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error buscando distritos', { status: err?.status });
        this.distritosEncontrados = [];
        this.buscandoDistritos = false;
        this.cdr.detectChanges();
      },
    });
  }

  // Formatea cualquier Distrito como "DISTRITO, PROVINCIA,
  // DEPARTAMENTO" -- misma regla en toda la pantalla (valor del
  // autocompletado y valor ya seleccionado). Arrow function (no método
  // de clase) para conservar `this` cuando `displayFn` la invoca desde
  // dentro de `fd-combobox`, igual que documenta la propia librería.
  formatearDistrito = (item: Distrito | null | undefined): string => {
    if (!item) {
      return '';
    }

    return `${item.distrito}, ${item.provincia}, ${item.departamento}`;
  };

  // Los resultados que muestra el desplegable son SIEMPRE los que ya
  // devolvió el Backend en `distritosEncontrados` (búsqueda ejecutada
  // en SQL Server) -- este "filtro" no vuelve a filtrar nada
  // localmente, solo evita que `fd-combobox` aplique su propio
  // filtrado por prefijo sobre el texto formateado ("DISTRITO,
  // PROVINCIA, DEPARTAMENTO"), que podría descartar resultados válidos.
  filtroDistritos = (items: Distrito[]): Distrito[] => items;

  /**
   * Validación mínima en Frontend (mismo criterio que
   * `contacto-modal.component.ts::validar()`): obligatoriedad de
   * campos. Si el usuario escribió texto en Distrito sin seleccionar
   * una opción real del autocompletado, `model.distritoSeleccionado`
   * queda `null` (con `communicateByObject`, `fd-combobox` no
   * actualiza el valor del `ngModel` hasta que el texto coincide
   * exactamente con un item del desplegable) -- por eso este mismo
   * chequeo cubre ambos casos ("no seleccionó nada" y "escribió algo
   * que no es un distrito real") con el mismo mensaje específico
   * exigido: "Selecciona un distrito válido."
   */
  private validar(): boolean {
    this.errores = {};
    let valido = true;

    if (!this.model.distritoSeleccionado) {
      this.errores.distrito = 'Selecciona un distrito válido.';
      valido = false;
    }

    if (!this.model.calle.trim()) {
      this.errores.calle = 'Calle es obligatoria.';
      valido = false;
    }

    if (!this.model.numero.trim()) {
      this.errores.numero = 'Número es obligatorio.';
      valido = false;
    }

    return valido;
  }

  guardar(): void {
    // 🔐 Evita doble envío mientras una operación ya está en curso
    // (doble click, Enter repetido, etc.).
    if (this.guardando) {
      return;
    }

    this.errorMessage = '';

    if (!this.validar()) {
      this.cdr.detectChanges();
      return;
    }

    const payload: DireccionInput = {
      idDistrito: this.model.distritoSeleccionado!.idDistrito,
      calle: this.model.calle.trim(),
      numero: this.model.numero.trim(),
      departamentoInterior: this.model.departamentoInterior.trim() || undefined,
    };

    const contactoId = this.dialogRef.data.contactoId;
    const direccionExistente = this.dialogRef.data.direccion;

    this.guardando = true;

    const request = direccionExistente
      ? this.contactosService.actualizarDireccion(
          contactoId,
          direccionExistente.idDireccion,
          payload,
        )
      : this.contactosService.crearDireccion(contactoId, payload);

    request.subscribe({
      next: () => {
        this.guardando = false;

        // ✅ Cierra el modal con `true` -- contacto-direcciones.
        // component.ts interpreta cualquier valor truthy recibido en
        // `afterClosed` como "hubo un cambio, refresca la lista".
        this.dialogRef.close(true);
      },

      error: (err) => {
        this.guardando = false;

        // 🔐 Nunca registrar el objeto de error completo (mismo
        // criterio que contacto-modal.component.ts).
        console.error('Error guardando dirección', {
          status: err?.status,
          message: err?.error?.message,
        });

        if (err?.status === 401 || err?.status === 403) {
          this.errorMessage =
            'No tienes autorización para realizar esta acción. Contacta a un administrador si consideras que se trata de un error.';
        } else if (err?.status === 404) {
          this.errorMessage = direccionExistente
            ? 'La dirección no fue encontrada.'
            : 'El contacto no fue encontrado.';
        } else if (err?.status === 400 && err?.error?.errors?.fieldErrors) {
          // Mismo criterio que contacto-modal.component.ts: cada error
          // debajo de su campo cuando el Backend distingue por campo
          // (direccion.validator.ts usa las claves idDistrito/calle/
          // numero/departamentoInterior -- se mapean 1:1 aquí; no se
          // reutiliza `construirErroresPorCampo` de
          // contacto-error.util.ts porque sus etiquetas/mensajes son
          // específicos de Contacto).
          const fieldErrors = err.error.errors.fieldErrors as Record<string, string[]>;

          this.errores = {
            distrito: fieldErrors['idDistrito']?.[0],
            calle: fieldErrors['calle']?.[0],
            numero: fieldErrors['numero']?.[0],
            departamentoInterior: fieldErrors['departamentoInterior']?.[0],
          };

          const hayErroresPorCampo = Object.values(this.errores).some(Boolean);

          this.errorMessage = hayErroresPorCampo
            ? ''
            : err?.error?.message || 'Datos de dirección inválidos.';
        } else if (err?.status === 400) {
          // DireccionDistritoInvalidoError u otro 400 sin fieldErrors
          // (el distrito seleccionado dejó de existir/activarse entre
          // que se cargó el autocompletado y se guardó) -- se asocia
          // al campo Distrito, igual que el resto de errores de ese
          // campo.
          this.errores.distrito = err?.error?.message || 'Selecciona un distrito válido.';
        } else {
          this.errorMessage =
            err?.error?.message ||
            'No fue posible guardar la dirección. Verifica los datos e inténtalo nuevamente.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
