import { Component, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { DialogRef, DialogModule } from '@fundamental-ngx/core/dialog';
import { FormModule } from '@fundamental-ngx/core/form';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';
import { DatePickerModule } from '@fundamental-ngx/core/date-picker';
import { FdDatetimeModule, FdDate } from '@fundamental-ngx/core/datetime';
import { ComboboxModule, ComboboxItem } from '@fundamental-ngx/core/combobox';

import { ContactosService } from '../../../core/services/contactos.service';
import {
  EmpresaBusqueda,
  TrabajoDependiente,
  TrabajoDependienteInput,
} from '../interfaces/actividad.interface';

/**
 * Fase Trabajos Dependientes (Etapa 4 -- arquitectura independiente,
 * patrón Direcciones) -- modal "Trabajo dependiente" (alta y edición),
 * abierto vía `DialogService.open(TrabajoDependienteModalComponent,
 * { data })`, mismo patrón que `DireccionModalComponent`.
 *
 * 🔐 ETAPA 4: a diferencia de la versión anterior de este componente
 * (solo alta, en memoria -- "Aceptar" nunca llamaba al Backend, el
 * resultado viajaba dentro de `trabajosNuevos` hasta el "Guardar" de
 * la pestaña completa), este modal ahora es INDEPENDIENTE, igual que
 * `DireccionModalComponent`: "Aceptar" llama directamente a
 * POST/PATCH `contactos/{contactoId}/trabajos-dependientes[/{id}]`
 * (Etapa 2, Backend) y solo cierra tras una respuesta HTTP exitosa.
 * `trabajo` presente en `data` = modo edición (precarga Empresa/Cargo/
 * Desde/Hasta); ausente/null = modo alta. Un único componente para
 * ambos casos, mismo criterio que el resto de modales del proyecto.
 *
 * 🔐 Campo "Empresa" -- el usuario ve un ÚNICO campo conceptual con
 * ícono de búsqueda (`[isSearch]="true"`, mismo control que
 * `fd-combobox` de DireccionModalComponent, pero SIN
 * `communicateByObject`: a diferencia de Distrito -- que exige un
 * distrito real del catálogo -- Empresa admite tanto seleccionar un
 * Contacto JURIDICA visible del buscador como escribir el nombre a
 * mano cuando el empleador no existe como Contacto JURIDICA en la
 * cartera del usuario (corrección explícita del dueño del proyecto).
 * Este componente decide INTERNAMENTE, al Aceptar, si el texto actual
 * coincide exactamente con la última empresa seleccionada del
 * buscador (-> `empresaContactoId`) o no (-> `empresaNombreLibre`) --
 * el usuario nunca ve ni conoce esos dos nombres técnicos. Mismo
 * criterio se aplica al precargar en modo edición (ver `ngOnInit`):
 * `trabajo.empresa.tipo === 'CONTACTO'` precarga `empresaSeleccionada`
 * como si el usuario ya la hubiese elegido del buscador.
 */
export interface TrabajoDependienteModalData {
  contactoId: string;
  trabajo: TrabajoDependiente | null;
}

interface TrabajoFormModel {
  empresaTexto: string;
  cargo: string;
  desde: FdDate | null;
  hasta: FdDate | null;
}

function modeloVacio(): TrabajoFormModel {
  return { empresaTexto: '', cargo: '', desde: null, hasta: null };
}

interface ErroresCampoTrabajo {
  empresa?: string;
  cargo?: string;
  desde?: string;
  hasta?: string;
}

// 📅 Mismo criterio de conversión FdDate <-> "YYYY-MM-DD" que ya usa el
// resto de la Ficha Contacto (fechaNacimiento en contacto-ficha) --
// evitado aquí un `Date` nativo (desfases de huso horario ya
// documentados en otras fases) a favor del tipo de fecha propio de
// Fundamental-ngx.
function fdDateToIso(fecha: FdDate | null): string | undefined {
  if (!fecha || !fecha.year || !fecha.month || !fecha.day) {
    return undefined;
  }

  const mm = String(fecha.month).padStart(2, '0');
  const dd = String(fecha.day).padStart(2, '0');

  return `${fecha.year}-${mm}-${dd}`;
}

// 📅 Inverso de `fdDateToIso`, para precargar el formulario en modo
// edición -- mismo criterio (regex sobre la parte de fecha, antes de
// una eventual 'T') que `contacto-ficha.component.ts::stringAFdDate`,
// replicado localmente (autocontenido, mismo patrón que el resto de
// este archivo) en vez de extraer un util compartido -- fuera de
// alcance de esta etapa ("no reorganización general").
// `TrabajoDependiente.desde`/`hasta`, tal como los devuelve
// trabajoDependiente.repository.ts::toIsoDate (Backend), siempre
// llegan como "YYYY-MM-DD" puro, sin hora.
function isoToFdDate(valor: string | null): FdDate | null {
  if (!valor) {
    return null;
  }

  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);

  if (!coincidencia) {
    return null;
  }

  const [, anio, mes, dia] = coincidencia;
  const fecha = new FdDate(Number(anio), Number(mes), Number(dia));

  return Number.isNaN(fecha.year) ? null : fecha;
}

@Component({
  selector: 'app-trabajo-dependiente-modal',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    FormModule,
    ButtonModule,
    BusyIndicatorModule,
    DatePickerModule,
    FdDatetimeModule,
    ComboboxModule,
  ],

  templateUrl: './trabajo-dependiente-modal.component.html',

  styleUrls: ['./trabajo-dependiente-modal.component.scss'],
})
export class TrabajoDependienteModalComponent implements OnInit, OnDestroy {
  model: TrabajoFormModel = modeloVacio();

  empresasEncontradas: EmpresaBusqueda[] = [];
  buscandoEmpresas = false;

  guardando = false;
  errorMessage = '';
  errores: ErroresCampoTrabajo = {};

  // 🔐 Última Empresa (Contacto JURIDICA) seleccionada del buscador --
  // `null` en cuanto el texto deja de coincidir EXACTAMENTE con su
  // razón social (el usuario siguió escribiendo/borró/cambió de
  // opinión), momento en el que este trabajo pasa a tratarse como
  // "nombre libre" si el usuario decide Aceptar así. En modo edición,
  // `ngOnInit` la precarga cuando `trabajo.empresa.tipo === 'CONTACTO'`.
  private empresaSeleccionada: EmpresaBusqueda | null = null;

  get esEdicion(): boolean {
    return !!this.dialogRef.data?.trabajo;
  }

  private busqueda$ = new Subject<string>();

  constructor(
    public dialogRef: DialogRef<TrabajoDependienteModalData>,
    private contactosService: ContactosService,
    // 📌 Mismo patrón que DireccionModalComponent: sin zone.js activo.
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const trabajoExistente = this.dialogRef.data?.trabajo;

    if (trabajoExistente) {
      // ✏️ Modo edición -- precarga Empresa/Cargo/Desde/Hasta. Si la
      // Empresa es un Contacto JURIDICA (`tipo === 'CONTACTO'`), se
      // precarga también `empresaSeleccionada` (como si el usuario ya
      // la hubiese elegido del buscador) y se agrega a
      // `empresasEncontradas` para que el combobox muestre el texto
      // sin depender de una búsqueda previa -- mismo criterio que
      // `DireccionModalComponent` precargando `distritosEncontrados`.
      const esDeContacto = trabajoExistente.empresa.tipo === 'CONTACTO';

      this.empresaSeleccionada = esDeContacto
        ? {
            contactoId: trabajoExistente.empresa.contactoId!,
            razonSocial: trabajoExistente.empresa.nombre,
          }
        : null;

      this.model = {
        empresaTexto: trabajoExistente.empresa.nombre,
        cargo: trabajoExistente.cargo,
        desde: isoToFdDate(trabajoExistente.desde),
        hasta: isoToFdDate(trabajoExistente.hasta),
      };

      if (this.empresaSeleccionada) {
        this.empresasEncontradas = [this.empresaSeleccionada];
      }
    }

    this.busqueda$
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((texto) => this.ejecutarBusqueda(texto));
  }

  ngOnDestroy(): void {
    this.busqueda$.complete();
  }

  onEmpresaInputChange(texto: string): void {
    // Cualquier edición manual del texto invalida la selección previa
    // -- si el texto ya no coincide con la razón social seleccionada,
    // se trata como una empresa distinta (posiblemente texto libre)
    // hasta que el usuario elija otra sugerencia real.
    if (this.empresaSeleccionada && texto !== this.empresaSeleccionada.razonSocial) {
      this.empresaSeleccionada = null;
    }

    this.busqueda$.next(texto ?? '');
  }

  onEmpresaSeleccionada(evento: ComboboxItem): void {
    const empresa = evento.item as EmpresaBusqueda;

    this.empresaSeleccionada = empresa;
    this.model.empresaTexto = empresa.razonSocial;
    this.empresasEncontradas = [empresa];
  }

  private ejecutarBusqueda(texto: string): void {
    const limpio = texto.trim();

    if (limpio.length < 2) {
      this.empresasEncontradas = [];
      this.buscandoEmpresas = false;
      this.cdr.detectChanges();
      return;
    }

    this.buscandoEmpresas = true;
    this.cdr.detectChanges();

    this.contactosService.buscarEmpresas(limpio).subscribe({
      next: (empresas) => {
        this.empresasEncontradas = empresas;
        this.buscandoEmpresas = false;
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error buscando empresas', { status: err?.status });
        this.empresasEncontradas = [];
        this.buscandoEmpresas = false;
        this.cdr.detectChanges();
      },
    });
  }

  formatearEmpresa = (item: EmpresaBusqueda | null | undefined): string => item?.razonSocial ?? '';

  // Mismo criterio que DireccionModalComponent::filtroDistritos: los
  // resultados ya vienen filtrados por el Backend (SQL Server) -- no
  // se vuelve a filtrar localmente por prefijo (evitaría descartar
  // resultados válidos).
  filtroEmpresas = (items: EmpresaBusqueda[]): EmpresaBusqueda[] => items;

  private validar(): boolean {
    this.errores = {};
    let valido = true;

    if (!this.model.empresaTexto.trim()) {
      this.errores.empresa = 'Empresa es requerida.';
      valido = false;
    }

    if (!this.model.cargo.trim() || this.model.cargo.trim().length < 2) {
      this.errores.cargo = 'Cargo es requerido.';
      valido = false;
    }

    const desdeIso = fdDateToIso(this.model.desde);
    const hastaIso = fdDateToIso(this.model.hasta);

    if (!desdeIso) {
      this.errores.desde = "Fecha 'Desde' es requerida.";
      valido = false;
    }

    if (desdeIso && hastaIso && hastaIso < desdeIso) {
      this.errores.hasta = "'Hasta' no puede ser anterior a 'Desde'.";
      valido = false;
    }

    return valido;
  }

  // ✅ "Aceptar" -- valida y arma el `TrabajoDependienteInput`, luego
  // llama POST (alta) o PATCH (edición, usando `trabajo.id`) --
  // mismo patrón que `DireccionModalComponent::guardar()`. Decide
  // aquí, de forma interna, cuál de los dos campos técnicos
  // corresponde: si el texto final coincide exactamente con la
  // última Empresa (Contacto JURIDICA) seleccionada del buscador ->
  // `empresaContactoId`; en cualquier otro caso (el usuario escribió/
  // editó el nombre a mano) -> `empresaNombreLibre`. El modal NO
  // cierra hasta que la respuesta HTTP llega -- nunca antes.
  aceptar(): void {
    // 🔐 Evita doble envío mientras una operación ya está en curso
    // (doble click, Enter repetido, etc.) -- mismo criterio que
    // DireccionModalComponent::guardar().
    if (this.guardando) {
      return;
    }

    this.errorMessage = '';

    if (!this.validar()) {
      this.cdr.detectChanges();
      return;
    }

    const texto = this.model.empresaTexto.trim();

    const esEmpresaDelBuscador =
      !!this.empresaSeleccionada && this.empresaSeleccionada.razonSocial === texto;

    const payload: TrabajoDependienteInput = {
      ...(esEmpresaDelBuscador
        ? { empresaContactoId: Number(this.empresaSeleccionada!.contactoId) }
        : { empresaNombreLibre: texto }),
      cargo: this.model.cargo.trim(),
      desde: fdDateToIso(this.model.desde)!,
      ...(fdDateToIso(this.model.hasta) ? { hasta: fdDateToIso(this.model.hasta) } : {}),
    };

    const contactoId = this.dialogRef.data.contactoId;
    const trabajoExistente = this.dialogRef.data.trabajo;

    this.guardando = true;

    const request = trabajoExistente
      ? this.contactosService.actualizarTrabajoDependiente(contactoId, trabajoExistente.id, payload)
      : this.contactosService.crearTrabajoDependiente(contactoId, payload);

    request.subscribe({
      next: () => {
        this.guardando = false;

        // ✅ Cierra el modal con `true` -- mismo criterio que
        // DireccionModalComponent: cualquier valor truthy recibido en
        // `afterClosed` significa "hubo un cambio, refresca la lista".
        this.dialogRef.close(true);
      },

      error: (err) => {
        this.guardando = false;

        // 🔐 Nunca registrar el objeto de error completo (mismo
        // criterio que DireccionModalComponent).
        console.error('Error guardando trabajo dependiente', {
          status: err?.status,
          message: err?.error?.message,
        });

        if (err?.status === 401 || err?.status === 403) {
          this.errorMessage =
            'No tienes autorización para realizar esta acción. Contacta a un administrador si consideras que se trata de un error.';
        } else if (err?.status === 404) {
          this.errorMessage = trabajoExistente
            ? 'El trabajo dependiente no fue encontrado.'
            : 'El contacto no fue encontrado.';
        } else if (err?.status === 400 && err?.error?.errors?.fieldErrors) {
          // Mismo criterio que DireccionModalComponent: cada error
          // debajo de su campo cuando el Backend distingue por campo
          // (trabajoDependiente.validator.ts usa las claves
          // empresaContactoId/empresaNombreLibre/cargo/desde/hasta --
          // el único campo visible es "Empresa", así que ambas claves
          // técnicas se mapean al mismo `errores.empresa`).
          const fieldErrors = err.error.errors.fieldErrors as Record<string, string[]>;

          this.errores = {
            empresa: fieldErrors['empresaContactoId']?.[0] || fieldErrors['empresaNombreLibre']?.[0],
            cargo: fieldErrors['cargo']?.[0],
            desde: fieldErrors['desde']?.[0],
            hasta: fieldErrors['hasta']?.[0],
          };

          const hayErroresPorCampo = Object.values(this.errores).some(Boolean);

          this.errorMessage = hayErroresPorCampo
            ? ''
            : err?.error?.message || 'Datos de trabajo dependiente inválidos.';
        } else if (err?.status === 400) {
          // TrabajoDependienteEmpresaInvalidaError/
          // TrabajoDependienteTipoIncorrectoError u otro 400 sin
          // fieldErrors -- se asocia al campo Empresa, la causa más
          // probable (la empresa seleccionada dejó de ser válida/
          // accesible entre que se cargó el autocompletado y se
          // guardó), mismo criterio que DireccionModalComponent
          // asociando ese caso al campo Distrito.
          this.errores.empresa = err?.error?.message || 'La empresa seleccionada no es válida.';
        } else {
          this.errorMessage =
            err?.error?.message ||
            'No fue posible guardar el trabajo dependiente. Verifica los datos e inténtalo nuevamente.';
        }

        this.cdr.detectChanges();
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
