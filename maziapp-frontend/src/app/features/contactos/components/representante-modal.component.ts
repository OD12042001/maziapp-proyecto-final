import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DialogRef, DialogModule } from '@fundamental-ngx/core/dialog';
import { FormModule } from '@fundamental-ngx/core/form';
import { SelectModule } from '@fundamental-ngx/core/select';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';

import { ContactosService } from '../../../core/services/contactos.service';
import {
  Representante,
  RepresentanteCreate,
  RepresentanteUpdate,
  TipoDocumentoRepresentante,
} from '../interfaces/representante.interface';

/**
 * Fase Representantes (Edición) -- modal "Representante" (alta y
 * edición), abierto vía `DialogService.open(RepresentanteModalComponent,
 * { data })` desde `contacto-representantes.component.ts` -- mismo
 * patrón exacto que `DireccionModalComponent`/
 * `contacto-direcciones.component.ts` (elegido explícitamente por el
 * usuario para esta fase: "que se abra un modal para registrar el
 * representante, parecido a como está en la pestaña 'Ubicación'").
 *
 * `representante` presente en `data` = modo edición (tipoDocumento/
 * numeroDocumento se muestran de solo lectura -- ver comentario junto
 * a `esEdicion`/el template; Nombres/Apellidos/Cargo/Celular/Correo
 * precargados y editables); ausente/null = modo alta (todos los campos
 * editables, igual que el formulario que reemplaza este modal).
 */
export interface RepresentanteModalData {
  contactoId: string;
  representante: Representante | null;
}

const TIPOS_DOCUMENTO_REPRESENTANTE: TipoDocumentoRepresentante[] = ['DNI', 'CE', 'PASAPORTE'];

interface RepresentanteFormModel {
  tipoDocumento: TipoDocumentoRepresentante;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  celular: string;
  correo: string;
}

function modeloVacio(): RepresentanteFormModel {
  return {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    cargo: '',
    celular: '',
    correo: '',
  };
}

/**
 * Errores por campo del formulario "Representante" -- mismo patrón que
 * `ErroresCampoDireccion` (direccion-modal.component.ts): un mensaje
 * debajo de cada input, nunca solo un mensaje genérico al pie cuando
 * el error es de un campo puntual.
 */
interface ErroresCampoRepresentante {
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  cargo?: string;
  celular?: string;
  correo?: string;
}

@Component({
  selector: 'app-representante-modal',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    FormModule,
    SelectModule,
    ButtonModule,
    BusyIndicatorModule,
  ],

  templateUrl: './representante-modal.component.html',

  styleUrls: ['./representante-modal.component.scss'],
})
export class RepresentanteModalComponent implements OnInit {
  tiposDocumento = TIPOS_DOCUMENTO_REPRESENTANTE;

  model: RepresentanteFormModel = modeloVacio();

  guardando = false;
  errorMessage = '';
  errores: ErroresCampoRepresentante = {};

  // 🔐 tipoDocumento/numeroDocumento son la llave de identidad de la
  // persona (UQ_Representantes_TipoDocumento_NumeroDocumento, Backend)
  // -- este modal los deja de SOLO LECTURA al editar (mismo criterio
  // documentado en representante.validator.ts::representanteUpdateBaseSchema:
  // el Backend ni siquiera acepta esos campos en el PATCH, así que el
  // Frontend nunca los envía en modo edición).
  get esEdicion(): boolean {
    return !!this.dialogRef.data?.representante;
  }

  constructor(
    public dialogRef: DialogRef<RepresentanteModalData>,

    private contactosService: ContactosService,

    // 📌 Mismo patrón ya usado en direccion-modal.component.ts /
    // contacto-modal.component.ts: el proyecto no tiene zone.js activo,
    // así que la vista solo se actualiza sola cuando el usuario
    // interactúa con algo más en la pantalla.
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const representanteExistente = this.dialogRef.data?.representante;

    if (representanteExistente) {
      this.model = {
        tipoDocumento: representanteExistente.tipoDocumento,
        numeroDocumento: representanteExistente.numeroDocumento,
        nombres: representanteExistente.nombres,
        apellidos: representanteExistente.apellidos,
        cargo: representanteExistente.cargo,
        celular: representanteExistente.celular ?? '',
        correo: representanteExistente.correo ?? '',
      };
    }
  }

  /**
   * Validación mínima en Frontend (mismo criterio que
   * `direccion-modal.component.ts::validar()`): obligatoriedad de
   * campos. El formato exacto (regex por tipo de documento, celular,
   * correo) sigue siendo responsabilidad final del Backend
   * (`representante.validator.ts`) -- no se duplica aquí.
   */
  private validar(): boolean {
    this.errores = {};
    let valido = true;

    // Documento solo se valida en modo alta -- en edición es de solo
    // lectura, ya tiene un valor válido persistido.
    if (!this.esEdicion) {
      if (!this.model.tipoDocumento) {
        this.errores.tipoDocumento = 'Selecciona un tipo de documento.';
        valido = false;
      }

      if (!this.model.numeroDocumento.trim()) {
        this.errores.numeroDocumento = 'Número de documento es obligatorio.';
        valido = false;
      }
    }

    if (!this.model.nombres.trim()) {
      this.errores.nombres = 'Nombres es obligatorio.';
      valido = false;
    }

    if (!this.model.apellidos.trim()) {
      this.errores.apellidos = 'Apellidos es obligatorio.';
      valido = false;
    }

    if (!this.model.cargo.trim()) {
      this.errores.cargo = 'Cargo es obligatorio.';
      valido = false;
    }

    return valido;
  }

  guardar(): void {
    // 🔐 Evita doble envío mientras una operación ya está en curso.
    if (this.guardando) {
      return;
    }

    this.errorMessage = '';

    if (!this.validar()) {
      this.cdr.detectChanges();
      return;
    }

    const contactoId = this.dialogRef.data.contactoId;
    const representanteExistente = this.dialogRef.data.representante;

    this.guardando = true;

    if (representanteExistente) {
      const payload: RepresentanteUpdate = {
        nombres: this.model.nombres.trim(),
        apellidos: this.model.apellidos.trim(),
        cargo: this.model.cargo.trim(),
        celular: this.model.celular.trim() || undefined,
        correo: this.model.correo.trim() || undefined,
      };

      this.contactosService
        .actualizarRepresentante(contactoId, representanteExistente.representanteId, payload)
        .subscribe({
          next: () => this.onGuardadoExitoso(),
          error: (err) => this.onErrorGuardando(err, true),
        });

      return;
    }

    const payload: RepresentanteCreate = {
      tipoDocumento: this.model.tipoDocumento,
      numeroDocumento: this.model.numeroDocumento.trim(),
      nombres: this.model.nombres.trim(),
      apellidos: this.model.apellidos.trim(),
      cargo: this.model.cargo.trim(),
      celular: this.model.celular.trim() || undefined,
      correo: this.model.correo.trim() || undefined,
    };

    this.contactosService.crearRepresentante(contactoId, payload).subscribe({
      next: () => this.onGuardadoExitoso(),
      error: (err) => this.onErrorGuardando(err, false),
    });
  }

  private onGuardadoExitoso(): void {
    this.guardando = false;

    // ✅ Cierra el modal con `true` -- contacto-representantes.
    // component.ts interpreta cualquier valor truthy recibido en
    // `afterClosed` como "hubo un cambio, refresca la lista" (mismo
    // criterio que direccion-modal.component.ts).
    this.dialogRef.close(true);
  }

  private onErrorGuardando(err: any, esEdicion: boolean): void {
    this.guardando = false;

    // 🔐 Nunca registrar el objeto de error completo (mismo criterio
    // que direccion-modal.component.ts/contacto-modal.component.ts).
    console.error('Error guardando representante', {
      status: err?.status,
      message: err?.error?.message,
    });

    if (err?.status === 401 || err?.status === 403) {
      this.errorMessage =
        'No tienes autorización para realizar esta acción. Contacta a un administrador si consideras que se trata de un error.';
    } else if (err?.status === 404) {
      this.errorMessage = esEdicion
        ? 'El representante no fue encontrado.'
        : 'El contacto no fue encontrado.';
    } else if (err?.status === 400 && err?.error?.errors?.fieldErrors) {
      // Mismo criterio que direccion-modal.component.ts: cada error
      // debajo de su campo cuando el Backend distingue por campo
      // (representante.validator.ts usa las claves tipoDocumento/
      // numeroDocumento/nombres/apellidos/cargo/celular/correo -- se
      // mapean 1:1 aquí).
      const fieldErrors = err.error.errors.fieldErrors as Record<string, string[]>;

      this.errores = {
        tipoDocumento: fieldErrors['tipoDocumento']?.[0],
        numeroDocumento: fieldErrors['numeroDocumento']?.[0],
        nombres: fieldErrors['nombres']?.[0],
        apellidos: fieldErrors['apellidos']?.[0],
        cargo: fieldErrors['cargo']?.[0],
        celular: fieldErrors['celular']?.[0],
        correo: fieldErrors['correo']?.[0],
      };

      const hayErroresPorCampo = Object.values(this.errores).some(Boolean);

      this.errorMessage = hayErroresPorCampo
        ? ''
        : err?.error?.message || 'Datos de representante inválidos.';
    } else if (err?.status === 409) {
      this.errorMessage =
        err?.error?.message ||
        'Este representante ya está registrado como representante de esta empresa.';
    } else {
      this.errorMessage =
        err?.error?.message ||
        'No fue posible guardar el representante. Verifica los datos e inténtalo nuevamente.';
    }

    this.cdr.detectChanges();
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }
}
