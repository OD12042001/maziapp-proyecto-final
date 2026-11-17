import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogRef, DialogModule } from '@fundamental-ngx/core/dialog';
import {
  ContactoCreate,
  TipoContacto,
  TipoDocumento,
  TipoDocumentoNatural,
} from '../interfaces/contacto-create.interface';
import { Contacto } from '../interfaces/contacto.interface';
import { ContactosService } from '../../../core/services/contactos.service';
import { construirErroresPorCampo, ErroresCampoContacto } from '../utils/contacto-error.util';

import { FormModule } from '@fundamental-ngx/core/form';
import { SelectModule } from '@fundamental-ngx/core/select';
import { InputGroupModule } from '@fundamental-ngx/core/input-group';
import { ButtonModule } from '@fundamental-ngx/core/button';

import { BusyIndicatorModule } from '@fundamental-ngx/core/busy-indicator';

/**
 * Estado interno del formulario del modal. NO es el contrato que se
 * envía al Backend (`ContactoCreate`, en `interfaces/contacto-create.
 * interface.ts`) — este modelo guarda a la vez los campos de NATURAL y
 * de JURIDICA porque el usuario puede alternar entre ambos mientras
 * completa el formulario; `guardar()` construye el payload final
 * incluyendo ÚNICAMENTE los campos que corresponden al tipoContacto
 * seleccionado (Fase 3.5, secciones 3-4).
 */
interface ContactoModalModel {
  tipoContacto: TipoContacto;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  razonSocial: string;
  celular: string;
}

const TIPOS_DOCUMENTO_NATURAL: TipoDocumentoNatural[] = ['DNI', 'CE', 'PASAPORTE'];
const TIPOS_DOCUMENTO_JURIDICA: TipoDocumento[] = ['RUC'];

@Component({
  selector: 'app-contacto-modal',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    FormModule,
    SelectModule,
    InputGroupModule,
    ButtonModule,
    BusyIndicatorModule,
  ],

  templateUrl: './contacto-modal.component.html',

  styleUrls: ['./contacto-modal.component.scss'],
})
export class ContactoModalComponent {
  // Fase 3.5, punto 2: valores visibles en español, valor enviado al
  // API exactamente 'NATURAL'/'JURIDICA' — nunca el texto visual.
  tiposContacto: { value: TipoContacto; label: string }[] = [
    { value: 'NATURAL', label: 'Persona natural' },
    { value: 'JURIDICA', label: 'Empresa' },
  ];

  model: ContactoModalModel = {
    tipoContacto: 'NATURAL',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    celular: '',
  };

  loading = false;

  errorMessage = '';

  // Fase 3.18: un mensaje por campo, para mostrarlo debajo del input
  // correspondiente (en vez de solo dentro de errorMessage).
  errores: ErroresCampoContacto = {};

  constructor(
    private dialogRef: DialogRef,

    private contactosService: ContactosService,

    private router: Router,

    // Fase 3.18: mismo patrón ya usado en contacto-ficha.component.ts /
    // contactos.component.ts para refrescar la vista inmediatamente
    // después de un subscribe() HTTP (el proyecto no tiene zone.js
    // activo, así que sin esto la vista solo se actualiza cuando el
    // usuario interactúa con algo más en la pantalla).
    private cdr: ChangeDetectorRef,
  ) {}

  /**
   * Tipos de documento válidos según el tipoContacto actual (Fase 3.5,
   * secciones 3-4): NATURAL admite DNI/CE/PASAPORTE, JURIDICA admite
   * únicamente RUC — mismas reglas que valida `contacto.validator.ts`
   * en el Backend, replicadas aquí solo para la UX del selector (el
   * Backend sigue siendo la autoridad final, punto 6).
   */
  get tiposDocumentoDisponibles(): TipoDocumento[] {
    return this.model.tipoContacto === 'JURIDICA'
      ? TIPOS_DOCUMENTO_JURIDICA
      : TIPOS_DOCUMENTO_NATURAL;
  }

  /**
   * Cambio dinámico del formulario (Fase 3.5, sección 5): al alternar
   * NATURAL ↔ JURIDICA se limpian los campos que ya no aplican y se
   * fuerza un tipoDocumento válido para el nuevo tipo, para que nunca
   * quede en el modelo (ni se intente enviar) una combinación
   * incoherente oculta.
   */
  onTipoContactoChange(): void {
    this.errorMessage = '';
    this.errores = {};
    this.model.numeroDocumento = '';

    if (this.model.tipoContacto === 'JURIDICA') {
      this.model.nombres = '';
      this.model.apellidos = '';
      this.model.tipoDocumento = 'RUC';
    } else {
      this.model.razonSocial = '';
      this.model.tipoDocumento = 'DNI';
    }
  }

  guardar(): void {
    this.errorMessage = '';
    this.errores = {};

    if (!this.validar()) {
      return;
    }

    const payload: ContactoCreate =
      this.model.tipoContacto === 'JURIDICA'
        ? {
            tipoContacto: 'JURIDICA',
            tipoDocumento: 'RUC',
            numeroDocumento: this.model.numeroDocumento.trim(),
            razonSocial: this.model.razonSocial.trim(),
            celular: this.model.celular.trim() || undefined,
          }
        : {
            tipoContacto: 'NATURAL',
            tipoDocumento: this.model.tipoDocumento as TipoDocumentoNatural,
            numeroDocumento: this.model.numeroDocumento.trim(),
            nombres: this.model.nombres.trim(),
            apellidos: this.model.apellidos.trim(),
            celular: this.model.celular.trim() || undefined,
          };

    this.loading = true;

    this.contactosService.crearContacto(payload).subscribe({
      next: (contactoCreado: Contacto) => {
        this.loading = false;

        // Fase 3.18: refresca la vista de inmediato (ver constructor).
        this.cdr.detectChanges();

        // 🔧 Fase 3.8 — CORRECCIÓN DE ORDEN (causa raíz de NG0100):
        // antes, `triggerRefresh()` se llamaba ANTES que `cerrar()`.
        // `triggerRefresh()` emite sobre un `Subject` plano
        // (`ContactosService.refresh$`), así que `ContactosComponent`
        // reacciona de forma SÍNCRONA (`cargarContactos()`), mutando
        // `ContactosComponent.loading` — una propiedad enlazada en
        // OTRO componente, ya renderizado (`contactos.component.html`,
        // `[loading]="loading"` en `fd-busy-indicator`).
        //
        // Inmediatamente después, `this.cerrar()` llamaba a
        // `dialogRef.close(false)`, que dispara internamente una
        // verificación de change detection sobre el árbol de vistas
        // de la aplicación (incluyendo `ContactosComponent`) para
        // actualizar el overlay del diálogo. Como esa verificación
        // ocurría en el MISMO ciclo síncrono en el que
        // `ContactosComponent.loading` ACABABA de cambiar de `false` a
        // `true`, Angular detectaba una inconsistencia entre el valor
        // ya verificado y el valor mutado a mitad de ciclo →
        // ExpressionChangedAfterItHasBeenCheckedError (NG0100) sobre
        // `contactos.component.html:7` (el binding `[loading]`).
        //
        // La corrección NO es un parche de temporización (no se usa
        // `setTimeout`/`Promise.resolve`/`detectChanges` forzado): es
        // reordenar la secuencia para que coincida con el flujo
        // esperado (Fase 3.8: "6. Modal se cierra. 7. ContactosComponent
        // actualiza la lista."). Cerrando el diálogo PRIMERO, su
        // verificación de change detection ocurre mientras
        // `ContactosComponent.loading` todavía vale `false` (el mismo
        // valor con el que fue verificado por última vez) — sin
        // inconsistencia. Recién DESPUÉS se notifica el refresco, y la
        // mutación de `loading` queda para el próximo ciclo normal de
        // Angular, sin ninguna verificación forzada compitiendo con
        // ella.

        // 🔥 CIERRA MODAL (primero)
        this.cerrar();

        // 🔥 REFRESCA TABLA (después de que el diálogo ya cerró)
        this.contactosService.triggerRefresh();

        // 🔧 Fase 3.10 — CREATE → ID → GET → FICHA:
        // `crearContacto()` está tipado como `Observable<Contacto>` y el
        // Backend (`createContacto.ts`) ya responde 201 con el objeto
        // COMPLETO creado (incluyendo `id`) — no un `{contactoId}`
        // suelto ni una respuesta vacía. La fuente de verdad tras
        // guardar es el Backend: no se arrastra el objeto del modal
        // hacia la Ficha, solo se usa el `id` de la respuesta para
        // navegar; `ContactoFichaComponent.cargarContacto()` hace su
        // propio GET /api/contactos/{id} (ver contacto-ficha.component.
        // ts) y esa respuesta es la que finalmente se muestra.
        //
        // Nunca se "inventa" un id: si el Backend alguna vez respondiera
        // éxito sin `id` (no debería ocurrir con la implementación
        // actual), simplemente no se navega y se deja constancia en
        // consola para diagnóstico — el contacto ya quedó creado y
        // visible en la lista gracias al `triggerRefresh()` anterior.
        if (contactoCreado?.id) {
          this.router.navigate(['/contactos', contactoCreado.id]);
        } else {
          console.error(
            'Contacto creado pero la respuesta del Backend no incluyó "id"',
            contactoCreado,
          );
        }
      },

      error: (err) => {
        this.loading = false;

        // 🔐 Nunca registrar el objeto de error completo (podría
        // incluir headers de la request, incluido Authorization) —
        // solo lo mínimo útil para depurar en desarrollo local.
        console.error('Error creando contacto', {
          status: err?.status,
          message: err?.error?.message,
        });

        if (err?.status === 401 || err?.status === 403) {
          // 🔐 Fase 3.10: 401/403 son errores de autenticación/
          // autorización (withAuth.ts responde { error: "Unauthorized" }
          // / { error: "Forbidden" }, sin `message`). Mostrar el mensaje
          // genérico de "verifica los datos" sería engañoso: el usuario
          // podría intentar corregir datos que ya son correctos sin
          // resolver el problema real de permisos.
          this.errorMessage =
            'No tienes autorización para realizar esta acción. Contacta a un administrador si consideras que se trata de un error.';
        } else {
          // 🔧 Fase 3.18 — cada error de campo debajo de su input, sin
          // repetirlo en el mensaje general (construirErroresPorCampo,
          // en utils/contacto-error.util.ts, separa fieldErrors de
          // formErrors sin tocar ninguna regla del Backend). Cuando el
          // cuerpo del error NO trae `errors.fieldErrors`/`formErrors`
          // (409 de documento duplicado, 500 genérico), ambos quedan
          // vacíos y se conserva exactamente el mismo fallback que ya
          // existía (Fase 3.17).
          const { camposConError, mensajeGeneral } = construirErroresPorCampo(err?.error);
          const hayErroresPorCampo = Object.keys(camposConError).length > 0;

          this.errores = camposConError;

          if (mensajeGeneral) {
            this.errorMessage = mensajeGeneral;
          } else if (hayErroresPorCampo) {
            // Cada error ya se muestra debajo de su campo: no repetirlo aquí.
            this.errorMessage = '';
          } else {
            this.errorMessage =
              err?.error?.message ||
              'No fue posible crear el contacto. Verifica los datos e inténtalo nuevamente.';
          }
        }

        // Fase 3.18: refresca la vista de inmediato (ver constructor).
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Validación mínima en Frontend (Fase 3.5, sección 6): solo
   * obligatoriedad de campos, coherente con las reglas que el Backend
   * ya aplica. Deliberadamente NO se duplica aquí el formato exacto de
   * documento/celular (regex por tipo de documento, longitud, etc.) —
   * esa sigue siendo responsabilidad final del Backend
   * (`contacto.validator.ts`); esta validación solo evita envíos
   * obviamente incompletos y mejora la UX.
   */
  private validar(): boolean {
    if (!this.model.tipoDocumento || !this.model.numeroDocumento.trim()) {
      this.errorMessage = 'Completa el tipo y número de documento.';
      return false;
    }

    if (this.model.tipoContacto === 'NATURAL') {
      if (!this.model.nombres.trim() || !this.model.apellidos.trim()) {
        this.errorMessage = 'Nombres y Apellidos son obligatorios para persona natural.';
        return false;
      }
    } else {
      if (!this.model.razonSocial.trim()) {
        this.errorMessage = 'Razón social es obligatoria para empresa.';
        return false;
      }
    }

    return true;
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
