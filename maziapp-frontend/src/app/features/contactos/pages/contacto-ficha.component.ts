import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DynamicPageModule } from '@fundamental-ngx/core/dynamic-page';
import { TabsModule } from '@fundamental-ngx/core/tabs';
import { FormModule } from '@fundamental-ngx/core/form';
import { SelectModule } from '@fundamental-ngx/core/select';
import { InputGroupModule } from '@fundamental-ngx/core/input-group';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { BarModule } from '@fundamental-ngx/core/bar';
import { DatePickerModule } from '@fundamental-ngx/core/date-picker';
import { RadioModule } from '@fundamental-ngx/core/radio';
import { SwitchModule } from '@fundamental-ngx/core/switch';
import { FdDatetimeModule, FdDate } from '@fundamental-ngx/core/datetime';
import { ContactosService } from '../../../core/services/contactos.service';
import { ChangeDetectorRef } from '@angular/core';
import { ContactoUpdate } from '../interfaces/contacto-update.interface';
import { ContactoRepresentantesComponent } from '../components/contacto-representantes.component';
import { ContactoDireccionesComponent } from '../components/contacto-direcciones.component';
import { ContactoActividadComponent } from '../components/contacto-actividad.component';
import { DialogService } from '@fundamental-ngx/core/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ComponentWithPendingChanges } from '../../../core/guards/pending-changes.guard';

@Component({
  selector: 'app-contacto-ficha',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    DynamicPageModule,
    TabsModule,
    FormModule,
    SelectModule,
    InputGroupModule,
    ButtonModule,
    BarModule,
    DatePickerModule,
    RadioModule,
    SwitchModule,
    FdDatetimeModule,
    ContactoRepresentantesComponent,
    ContactoDireccionesComponent,
    ContactoActividadComponent,
  ],

  templateUrl: './contacto-ficha.component.html',

  styleUrls: ['./contacto-ficha.component.scss'],
})
export class ContactoFichaComponent implements OnInit, ComponentWithPendingChanges {
  contactoId = '';

  /**
   * 🔧 Fase 3.9 — CORRECCIÓN DE CRASH (Cannot read properties of
   * undefined (reading 'tipoDocumento')):
   *
   * El objeto inicial usaba un shape ANIDADO (`demografia`/`ubicacion`)
   * que nunca coincidió con la respuesta real de
   * `GET /api/contactos/{id}` (`contacto.repository.ts::toDomain()`,
   * Backend — objeto PLANO, ya confirmado y corregido en la Fase 3.8
   * para `contacto.interface.ts` y `contactos.component.ts/html`).
   *
   * Aquí el síntoma era distinto al de la Fase 3.8 (que solo mostraba
   * celdas vacías gracias al operador `?.`): esta plantilla usa
   * `[(ngModel)]="contacto.demografia.tipoDocumento"` SIN navegación
   * seguro. Mientras `contacto` conservaba el objeto inicial (con
   * `demografia` definido), no fallaba. Pero en `cargarContacto()`,
   * `this.contacto = data` REEMPLAZA el objeto completo por la
   * respuesta real y PLANA del Backend, así que `contacto.demografia`
   * pasa a ser `undefined` y Angular lanza
   * `TypeError: Cannot read properties of undefined (reading
   * 'tipoDocumento')` al intentar leer `contacto.demografia
   * .tipoDocumento`.
   *
   * Corrección: el objeto inicial (y todos los bindings del template)
   * ahora usan el mismo shape PLANO real que ya expone
   * `Contacto` (`contacto.interface.ts`) — sin `demografia`/`ubicacion`
   * — para que la carga real de datos nunca reemplace una rama del
   * objeto por `undefined`.
   */
  contacto: any = {
    id: '',
    pid: 0,
    tipoContacto: 'NATURAL',
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidos: '',
    razonSocial: '',
    fechaNacimiento: '',
    sexo: '',
    estadoCivil: '',
    nacionalidad: '',
    paisResidencia: '',
    esPep: false,
    estadoContacto: '',
    celular: '',
    correo: '',
    telefonoFijo: '',
    responsableId: '',
    creado: null,
    actualizado: null,
  };

  // 📌 Fase 3.15 / 7A — estado de guardado por sección (Cliente /
  // Ubicación), independiente entre sí: guardar una no debe afectar el
  // estado visual de la otra.
  guardandoCliente = false;
  mensajeCliente: { tipo: 'exito' | 'error'; texto: string } | null = null;

  guardandoUbicacion = false;
  mensajeUbicacion: { tipo: 'exito' | 'error'; texto: string } | null = null;

  // 📌 Fase "Patrón definitivo de guardado" — foto (JSON) de `contacto`
  // tomada tras la última carga/guardado exitoso. `hayCambiosSinGuardar()`
  // compara `contacto` actual contra esta foto para decidir si hay
  // ediciones pendientes en Cliente y/o Ubicación (ambas pestañas
  // comparten el mismo objeto `contacto`, así que una sola foto de todo
  // el objeto cubre ambas sin necesidad de dos mecanismos separados).
  private contactoSnapshot: string = JSON.stringify(this.contacto);

  constructor(
    private route: ActivatedRoute,
    private contactosService: ContactosService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.contactoId = params['id'];

      if (this.contactoId) {
        this.cargarContacto();
      }
    });
  }

  cargarContacto() {
    this.contactosService.obtenerPorId(this.contactoId).subscribe({
      next: (data) => {
        this.contacto = data;

        // 📌 Fase "Patrón definitivo de guardado": la carga real es la
        // línea base contra la que se compara `hayCambiosSinGuardar()`.
        this.contactoSnapshot = JSON.stringify(this.contacto);

        // 🔥 refrescar vista
        this.cdr.detectChanges();
      },

      error: (err) => {
        console.error('Error cargando contacto', err);
      },
    });
  }

  // 📌 Fase "Patrón definitivo de guardado" — true si `contacto` (Cliente
  // + Ubicación, mismo objeto compartido) difiere de la última foto
  // tomada tras cargar o guardar con éxito.
  hayCambiosSinGuardar(): boolean {
    return JSON.stringify(this.contacto) !== this.contactoSnapshot;
  }

  // 📌 Fase "Patrón definitivo de guardado" — implementa
  // `ComponentWithPendingChanges` (core/guards/pending-changes.guard.ts),
  // invocado por Angular Router SOLO ante una navegación real que
  // abandona esta ruta (`app.routes.ts`, `canDeactivate:
  // [pendingChangesGuard]` en `contactos/:id`) -- nunca ante un cambio de
  // pestaña dentro de esta misma Ficha Contacto (eso no es navegación de
  // Router, y además no descarta ningún dato: `contacto` es el mismo
  // objeto en memoria sin importar qué pestaña esté visible).
  //
  // Sin cambios pendientes: permite salir de inmediato, sin diálogo. Con
  // cambios pendientes: abre la confirmación "Tienes cambios sin
  // guardar..." -- [Seguir editando] cancela la navegación (cierra el
  // diálogo con `false`), [Salir sin guardar] la permite (`true`), sin
  // ejecutar ningún POST/PATCH en ningún caso (descarta los cambios en
  // memoria simplemente dejando de usarlos: al reutilizarse esta misma
  // instancia para otro contacto, `cargarContacto()` reemplaza `contacto`
  // con datos frescos del servidor).
  canDeactivate(): boolean | Observable<boolean> {
    if (!this.hayCambiosSinGuardar()) {
      return true;
    }

    const data: ConfirmDialogData = {
      title: 'Cambios sin guardar',
      message: 'Tienes cambios sin guardar. ¿Deseas salir sin guardar?',
      cancelText: 'Seguir editando',
      confirmText: 'Salir sin guardar',
    };

    const dialogRef = this.dialogService.open(ConfirmDialogComponent, { data });

    return dialogRef.afterClosed.pipe(map((resultado) => !!resultado));
  }

  // 📌 Fase 3.15 / 7A — construye el payload de una sección a partir de
  // `this.contacto`, incluyendo ÚNICAMENTE las claves con un valor real
  // (no '', null ni undefined). Así, un campo que nunca se llenó
  // simplemente no viaja en el PATCH — nunca se envía vacío para pisar
  // un valor existente que esta sección ni siquiera está mostrando, y
  // se evita que el Backend rechace por formato un campo opcional que
  // el usuario nunca completó (fecha/enum/regex).
  private omitirVacios(payload: ContactoUpdate): ContactoUpdate {
    const resultado: any = {};

    for (const [clave, valor] of Object.entries(payload)) {
      if (valor !== '' && valor !== null && valor !== undefined) {
        resultado[clave] = valor;
      }
    }

    return resultado;
  }

  // 🔧 Fase 3.16 — CORRECCIÓN "FECHA DE NACIMIENTO NO SE GUARDA".
  //
  // CAUSA RAÍZ (confirmada leyendo el código fuente real de
  // `@fundamental-ngx/core/date-picker`, no asumida): `fd-date-picker`
  // implementa `ControlValueAccessor` — el `[(ngModel)]` debe enlazarse
  // DIRECTAMENTE sobre `<fd-date-picker>`, nunca sobre un `<input>`
  // proyectado dentro de él (ese `<input>` es contenido huérfano que
  // Angular solo renderiza cuando el desplegable del calendario está
  // abierto, y no es el control visible real — el HTML anterior tenía
  // `[(ngModel)]="contacto.fechaNacimiento"` en ese `<input>` huérfano,
  // así que nada de lo que el usuario hacía en el calendario llegaba
  // nunca a `contacto.fechaNacimiento`).
  //
  // El adaptador `FdDatetimeAdapter` (registrado por `FdDatetimeModule`,
  // ya importado en este componente) usa `FdDate` como tipo de valor —
  // no un `string` ni un `Date` nativo. `contacto.fechaNacimiento` debe
  // seguir siendo un `string` `YYYY-MM-DD` en todo el resto del
  // componente (así lo esperan `ContactoUpdate`, el Zod del Backend, y
  // así lo sigue devolviendo el GET) — por eso este getter/setter actúa
  // como adaptador ACOTADO exclusivamente a este campo, sin tocar
  // `toIso()` del Backend ni el tratamiento de `creado.fecha`/
  // `actualizado.fecha` (que siguen siendo datetime completos, sin
  // cambios).
  // 🔧 Prueba controlada -- CACHE de identidad para fechaNacimientoFdDate.
  // stringAFdDate() construye un FdDate NUEVO en cada lectura (misma
  // fecha, referencia distinta). Este cache explícito evita eso: el
  // getter solo vuelve a llamar a stringAFdDate() cuando el STRING
  // contacto.fechaNacimiento cambió realmente; si no cambió, devuelve
  // el mismo objeto FdDate ya cacheado. stringAFdDate()/fdDateAString()
  // no se modifican.
  private fechaNacimientoFdDateCacheString: string | null | undefined = undefined;
  private fechaNacimientoFdDateCacheValor: FdDate | null = null;

  get fechaNacimientoFdDate(): FdDate | null {
    const actual = this.contacto.fechaNacimiento;

    if (actual !== this.fechaNacimientoFdDateCacheString) {
      this.fechaNacimientoFdDateCacheString = actual;
      this.fechaNacimientoFdDateCacheValor = this.stringAFdDate(actual);
    }

    return this.fechaNacimientoFdDateCacheValor;
  }

  set fechaNacimientoFdDate(valor: FdDate | null) {
    this.contacto.fechaNacimiento = this.fdDateAString(valor);

    // Deja el cache consistente con el valor recién asignado, para que
    // la siguiente lectura no dispare una reconstrucción innecesaria.
    this.fechaNacimientoFdDateCacheString = this.contacto.fechaNacimiento;
    this.fechaNacimientoFdDateCacheValor = valor;
  }

  // 📌 El GET puede devolver la fecha como `YYYY-MM-DD` puro o, si la
  // columna SQL se lee como `Date` de JS, como datetime ISO completo
  // (`YYYY-MM-DDTHH:mm:ss.sssZ` — ver hallazgo de la Fase 1, Backend
  // `toIso()`, NO modificado). Se toma únicamente la parte de fecha
  // (antes de la 'T'), sin depender de que el Backend cambie su
  // formato de salida.
  private stringAFdDate(valor: string | null | undefined): FdDate | null {
    if (!valor) {
      return null;
    }

    const parteFecha = valor.split('T')[0];
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(parteFecha);

    if (!coincidencia) {
      return null;
    }

    const [, anio, mes, dia] = coincidencia;
    const fecha = new FdDate(Number(anio), Number(mes), Number(dia));

    return Number.isNaN(fecha.year) ? null : fecha;
  }

  // 📌 Siempre produce `YYYY-MM-DD` (con ceros a la izquierda) — el
  // formato exacto que exige `contactoUpdate.validator.ts` (`z.string()
  // .date()`), sin modificar ese schema.
  private fdDateAString(valor: FdDate | null): string {
    if (!valor || Number.isNaN(valor.year)) {
      return '';
    }

    const pad = (n: number) => String(n).padStart(2, '0');

    return `${valor.year}-${pad(valor.month)}-${pad(valor.day)}`;
  }

  // ✏️ GUARDAR — CLIENTE (Fase 3.15 / 7A)
  //
  // Solo incluye los campos "adicionales" propios de la pestaña
  // Cliente. NUNCA incluye tipoContacto/tipoDocumento/numeroDocumento/
  // responsableId/id/creadoId/actualizadoId ni ningún otro campo
  // técnico/de auditoría — ni siquiera están declarados en
  // `ContactoUpdate`, así que TypeScript ya lo impide. Según
  // `contacto.tipoContacto` (dato YA EXISTENTE, nunca se modifica desde
  // aquí) se envía `razonSocial` (JURIDICA) o `nombres`/`apellidos`
  // (NATURAL), nunca ambos — igual que ya distingue el template.
  //
  // 🔧 Fase 3.16 — VISIBILIDAD JURIDICA/RUC: para JURIDICA, el template
  // ahora oculta estadoCivil/fechaNacimiento/sexo/nacionalidad/
  // paisResidencia/esPep (campos exclusivos de Persona Natural) — este
  // payload debe reflejar exactamente lo mismo, para no reenviar
  // valores de campos que el usuario ya no puede ver ni editar en esa
  // rama. Para NATURAL se sigue enviando todo, sin cambios.
  //
  // 🔧 CORRECCIÓN HTTP 400 -- el Backend exige `fechaNacimiento` en
  // formato YYYY-MM-DD (`z.string().date()` en
  // `contactoUpdate.validator.ts`, sin cambios) y rechaza cualquier
  // valor con componente de hora/zona horaria. `this.contacto.fechaNacimiento`
  // puede contener un datetime ISO completo (p. ej.
  // "2007-08-07T00:00:00.000Z") cuando ese valor llegó tal cual en la
  // respuesta del Backend y el usuario no editó la fecha en este
  // guardado -- `fdDateAString()` sí normaliza a YYYY-MM-DD cuando el
  // usuario edita vía el date-picker, pero ese valor no se
  // re-normaliza si simplemente viaja sin tocar. Se normaliza
  // ÚNICAMENTE el valor que se envía en este payload de guardado --
  // `this.contacto` no se modifica, así que la UI sigue mostrando la
  // fecha exactamente igual.
  private normalizarFechaNacimientoParaEnvio(
    valor: string | null | undefined,
  ): string | undefined {
    if (!valor) {
      // null -> undefined (coincide con ContactoUpdate.fechaNacimiento?: string,
      // que no admite null); '' se preserva tal cual para que
      // omitirVacios() la siga filtrando exactamente como antes.
      return valor ?? undefined;
    }

    return valor.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? valor;
  }

  guardarCliente() {
    const payload: ContactoUpdate =
      this.contacto.tipoContacto === 'JURIDICA'
        ? {
            razonSocial: this.contacto.razonSocial,
          }
        : {
            nombres: this.contacto.nombres,
            apellidos: this.contacto.apellidos,
            fechaNacimiento: this.normalizarFechaNacimientoParaEnvio(
              this.contacto.fechaNacimiento,
            ),
            sexo: this.contacto.sexo,
            estadoCivil: this.contacto.estadoCivil,
            nacionalidad: this.contacto.nacionalidad,
            paisResidencia: this.contacto.paisResidencia,
            esPep: this.contacto.esPep,
          };

    this.guardandoCliente = true;
    this.mensajeCliente = null;

    this.contactosService
      .actualizarContacto(this.contactoId, this.omitirVacios(payload))
      .subscribe({
        next: (actualizado) => {
          // 🔧 Fase "Patrón definitivo de guardado": antes se hacía
          // `this.contacto = actualizado` (reemplazo COMPLETO). Eso es
          // seguro para la BD (el Backend preserva las columnas que este
          // guardado no tocó), pero NO era seguro para el FRONTEND: si el
          // usuario tenía cambios sin guardar en Ubicación (celular/
          // correo) en el momento de guardar Cliente, esos valores en
          // memoria se perdían silenciosamente al ser sobrescritos por
          // los valores (antiguos, aún no guardados) que devuelve el
          // Backend para esa otra sección -- hallazgo de la auditoría de
          // esta fase, directamente relacionado con "no perder cambios
          // sin guardar" (el objetivo de esta fase). Se aplica ahora SOLO
          // el parche de los campos que esta sección (Cliente) realmente
          // envió, preservando cualquier edición pendiente sin guardar de
          // otras secciones de esta misma Ficha Contacto.
          const parche: any = { actualizado: actualizado?.actualizado };
          for (const clave of Object.keys(payload)) {
            parche[clave] = (actualizado as any)?.[clave];
          }
          this.contacto = { ...this.contacto, ...parche };
          this.guardandoCliente = false;
          this.mensajeCliente = { tipo: 'exito', texto: 'Datos del cliente guardados.' };
          this.contactoSnapshot = JSON.stringify(this.contacto);
          this.cdr.detectChanges();
        },

        error: (err) => {
          console.error('Error guardando datos de cliente', err);
          this.guardandoCliente = false;

          this.mensajeCliente = {
            tipo: 'error',
            texto:
              err?.status === 401 || err?.status === 403
                ? 'No tienes permisos para actualizar este contacto.'
                : err?.status === 404
                  ? 'El contacto no fue encontrado.'
                  : 'No se pudo guardar. Verifica los datos e intenta nuevamente.',
          };
          this.cdr.detectChanges();
        },
      });
  }

  // ✏️ GUARDAR — UBICACIÓN (Fase 3.15 / 7A)
  //
  // Mismo criterio que guardarCliente(): solo los campos propios de
  // esta pestaña (celular/correo), nunca campos técnicos ni de otra
  // sección.
  guardarUbicacion() {
    // 📌 Fase 3.15 / 7A: solo Celular/Correo — son los únicos campos
    // que esta pestaña ya mostraba antes de esta fase (auditoría Fase
    // 1-6). `telefonoFijo` existe en `dbo.Contactos` y en el contrato
    // de actualización, pero no se agrega aquí un campo nuevo a la UI
    // sin autorización explícita ("no inventes campos").
    const payload: ContactoUpdate = {
      celular: this.contacto.celular,
      correo: this.contacto.correo,
    };

    this.guardandoUbicacion = true;
    this.mensajeUbicacion = null;

    this.contactosService
      .actualizarContacto(this.contactoId, this.omitirVacios(payload))
      .subscribe({
        next: (actualizado) => {
          // 🔧 Fase "Patrón definitivo de guardado": mismo criterio y
          // mismo motivo que guardarCliente() -- ver comentario ahí. Se
          // parchean solo celular/correo (los campos que esta sección
          // realmente envió), preservando cualquier edición sin guardar
          // pendiente en Cliente.
          const parche: any = { actualizado: actualizado?.actualizado };
          for (const clave of Object.keys(payload)) {
            parche[clave] = (actualizado as any)?.[clave];
          }
          this.contacto = { ...this.contacto, ...parche };
          this.guardandoUbicacion = false;
          this.mensajeUbicacion = { tipo: 'exito', texto: 'Ubicación guardada.' };
          this.contactoSnapshot = JSON.stringify(this.contacto);
          this.cdr.detectChanges();
        },

        error: (err) => {
          console.error('Error guardando ubicación', err);
          this.guardandoUbicacion = false;

          this.mensajeUbicacion = {
            tipo: 'error',
            texto:
              err?.status === 401 || err?.status === 403
                ? 'No tienes permisos para actualizar este contacto.'
                : err?.status === 404
                  ? 'El contacto no fue encontrado.'
                  : 'No se pudo guardar. Verifica los datos e intenta nuevamente.',
          };
          this.cdr.detectChanges();
        },
      });
  }
}
