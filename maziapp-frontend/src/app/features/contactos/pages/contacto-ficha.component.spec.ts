/**
 * Fase 3.16 — cobertura de los dos problemas corregidos en la Ficha de
 * Contacto:
 *   1. Fecha de nacimiento no se guardaba (binding roto del
 *      fd-date-picker) -> adaptador fechaNacimientoFdDate.
 *   2. Visibilidad de campos exclusivos de Persona Natural para
 *      contactos JURIDICA/RUC -> payload de guardarCliente().
 *
 * Se instancia el componente directamente con `new` (sin TestBed) para
 * probar únicamente la lógica TypeScript de estos dos cambios, sin
 * depender de la compilación de plantilla ni de los módulos de
 * Fundamental NGX — evita introducir la primera configuración de
 * TestBed para un componente con esa cantidad de dependencias externas
 * en un cambio que no la necesita. `ContactoFichaComponent` no hace
 * nada especial en su constructor más allá de guardar las
 * dependencias inyectadas, así que instanciarlo así es válido para
 * este propósito.
 *
 * No se usan spies de ningún framework de testing (`jasmine.createSpy`,
 * `vi.fn()`, etc.): el proyecto usa Vitest (ver package.json), pero
 * para no depender de una API de mocks específica se usan stubs
 * manuales (closures simples) — funcionan igual sin importar el motor
 * de pruebas configurado.
 */
import { of, Observable } from 'rxjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { FdDate } from '@fundamental-ngx/core/datetime';

import { ContactoFichaComponent } from './contacto-ficha.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { ContactoUpdate } from '../interfaces/contacto-update.interface';

function crearContactosServiceStub() {
  const llamadasActualizar: Array<[string, ContactoUpdate]> = [];

  return {
    stub: {
      obtenerPorId: () => of({}),
      actualizarContacto: (id: string, data: ContactoUpdate) => {
        llamadasActualizar.push([id, data]);
        return of({});
      },
    } as unknown as ContactosService,
    llamadasActualizar,
  };
}

function crearComponente() {
  const { stub, llamadasActualizar } = crearContactosServiceStub();

  const routeStub = { params: of({ id: '1' }) } as any;
  const cdrStub = { detectChanges: () => {}, markForCheck: () => {} } as any;

  // 📌 Fase "Patrón definitivo de guardado" -- stub mínimo de
  // `DialogService` (mismo criterio que el resto de este archivo: sin
  // spies de ningún framework, solo closures). `ultimoDialogData`
  // permite comprobar CON QUÉ datos se abrió el diálogo de
  // confirmación (mensaje/textos de botón) sin depender de
  // renderizar la plantilla real de `ConfirmDialogComponent`.
  // `setRespuestaDialog` controla qué emite `afterClosed`, para
  // simular que el usuario eligió "Seguir editando" (false) o "Salir
  // sin guardar" (true).
  let ultimoDialogData: any = null;
  let respuestaDialog = false;
  const dialogServiceStub = {
    open: (_componente: any, config: any) => {
      ultimoDialogData = config?.data ?? null;
      return { afterClosed: of(respuestaDialog) };
    },
  } as any;

  const component = new ContactoFichaComponent(routeStub, stub, cdrStub, dialogServiceStub);

  return {
    component,
    llamadasActualizar,
    obtenerUltimoDialogData: () => ultimoDialogData,
    setRespuestaDialog: (valor: boolean) => {
      respuestaDialog = valor;
    },
  };
}

describe('ContactoFichaComponent', () => {
  describe('fechaNacimientoFdDate (Fase 3.16 — adaptador FdDate <-> string)', () => {
    it('getter: convierte un string YYYY-MM-DD a FdDate con el mismo año/mes/día', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '1990-12-25';

      const resultado = component.fechaNacimientoFdDate;

      expect(resultado).not.toBeNull();
      expect(resultado?.year).toBe(1990);
      expect(resultado?.month).toBe(12);
      expect(resultado?.day).toBe(25);
    });

    it('getter: toma solo la parte de fecha si el Backend devuelve datetime completo (toIso() sin modificar)', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '1990-12-25T00:00:00.000Z';

      const resultado = component.fechaNacimientoFdDate;

      expect(resultado?.year).toBe(1990);
      expect(resultado?.month).toBe(12);
      expect(resultado?.day).toBe(25);
    });

    it('getter: devuelve null cuando fechaNacimiento está vacío', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '';

      expect(component.fechaNacimientoFdDate).toBeNull();
    });

    it('getter: devuelve null ante un formato irreconocible (defensivo, sin lanzar error)', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '25/12/1990';

      expect(component.fechaNacimientoFdDate).toBeNull();
    });

    it('setter: escribe contacto.fechaNacimiento como YYYY-MM-DD con ceros a la izquierda', () => {
      const { component } = crearComponente();

      component.fechaNacimientoFdDate = new FdDate(1990, 3, 5);

      expect(component.contacto.fechaNacimiento).toBe('1990-03-05');
    });

    it('setter: con null, deja contacto.fechaNacimiento en string vacío (nunca null/undefined)', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '1990-12-25';

      component.fechaNacimientoFdDate = null;

      expect(component.contacto.fechaNacimiento).toBe('');
    });

    it('round-trip: string -> FdDate -> string produce el mismo valor', () => {
      const { component } = crearComponente();
      component.contacto.fechaNacimiento = '2001-01-09';

      const fd = component.fechaNacimientoFdDate;
      component.fechaNacimientoFdDate = fd;

      expect(component.contacto.fechaNacimiento).toBe('2001-01-09');
    });
  });

  describe('guardarCliente() — payload según tipoContacto (Fase 3.16 — visibilidad JURIDICA/RUC)', () => {
    it('JURIDICA: el payload enviado a actualizarContacto contiene únicamente razonSocial', () => {
      const { component, llamadasActualizar } = crearComponente();
      component.contactoId = '1';
      component.contacto = {
        ...component.contacto,
        tipoContacto: 'JURIDICA',
        razonSocial: 'Empresa SAC',
        fechaNacimiento: '1990-12-25',
        sexo: 'MASCULINO',
        estadoCivil: 'SOLTERO',
        nacionalidad: 'PERUANA',
        paisResidencia: 'PERU',
        esPep: true,
      };

      component.guardarCliente();

      expect(llamadasActualizar.length).toBe(1);
      const [, payloadEnviado] = llamadasActualizar[0];

      expect(payloadEnviado).toEqual({ razonSocial: 'Empresa SAC' });
      expect('fechaNacimiento' in payloadEnviado).toBe(false);
      expect('sexo' in payloadEnviado).toBe(false);
      expect('estadoCivil' in payloadEnviado).toBe(false);
      expect('nacionalidad' in payloadEnviado).toBe(false);
      expect('paisResidencia' in payloadEnviado).toBe(false);
      expect('esPep' in payloadEnviado).toBe(false);
      expect('nombres' in payloadEnviado).toBe(false);
      expect('apellidos' in payloadEnviado).toBe(false);
    });

    it('NATURAL: el payload sigue incluyendo fechaNacimiento y los demás campos, sin cambios', () => {
      const { component, llamadasActualizar } = crearComponente();
      component.contactoId = '1';
      component.contacto = {
        ...component.contacto,
        tipoContacto: 'NATURAL',
        nombres: 'Juan',
        apellidos: 'Perez',
        fechaNacimiento: '1990-12-25',
        sexo: 'MASCULINO',
        estadoCivil: 'SOLTERO',
        nacionalidad: 'PERUANA',
        paisResidencia: 'PERU',
        esPep: false,
      };

      component.guardarCliente();

      expect(llamadasActualizar.length).toBe(1);
      const [, payloadEnviado] = llamadasActualizar[0];

      expect(payloadEnviado.fechaNacimiento).toBe('1990-12-25');
      expect(payloadEnviado.nombres).toBe('Juan');
      expect(payloadEnviado.apellidos).toBe('Perez');
      expect(payloadEnviado.sexo).toBe('MASCULINO');
      expect(payloadEnviado.estadoCivil).toBe('SOLTERO');
      expect(payloadEnviado.nacionalidad).toBe('PERUANA');
      expect(payloadEnviado.paisResidencia).toBe('PERU');
      expect(payloadEnviado.esPep).toBe(false);
      expect('razonSocial' in payloadEnviado).toBe(false);
    });

    it('JURIDICA: guardarCliente() envía la actualización al mismo contactoId de la ruta', () => {
      const { component, llamadasActualizar } = crearComponente();
      component.contactoId = '42';
      component.contacto = {
        ...component.contacto,
        tipoContacto: 'JURIDICA',
        razonSocial: 'Otra Empresa SAC',
      };

      component.guardarCliente();

      expect(llamadasActualizar[0][0]).toBe('42');
    });
  });

  // 📌 Fase Representantes — verificación de HECHOS DE PLANTILLA
  // (existencia de la pestaña Prospectos, condición *ngIf de
  // Representantes) que el patrón `new ContactoFichaComponent(...)`
  // usado en este archivo NO puede verificar (no compila la
  // plantilla). Se lee el archivo .html real con `readFileSync` y se
  // afirma por coincidencia de texto — alternativa pragmática a
  // introducir TestBed (que reintroduciría la complejidad de DI que
  // este proyecto deliberadamente evita fuera de app.spec.ts).
  describe('contacto-ficha.component.html — Prospectos eliminado / Representantes condicional (Fase Representantes)', () => {
    function leerTemplate(): string {
      // 🐛 Fix: bajo el runner de Vitest en modo navegador que usa
      // este proyecto (@angular/build:unit-test), `import.meta.url`
      // no siempre resuelve a un URL de esquema `file:` (rompía
      // fileURLToPath con "The URL must be of scheme file"). Se
      // intenta primero la ruta original (funciona en Node puro, por
      // si el entorno cambia) y, si falla, se cae a una ruta basada en
      // `process.cwd()` (la raíz de maziapp-frontend, desde donde se
      // ejecuta `ng test`) -- no relacionado con Direcciones, gap
      // preexistente de esta fase (Representantes).
      try {
        const rutaTemplate = fileURLToPath(
          new URL('./contacto-ficha.component.html', import.meta.url),
        );
        return readFileSync(rutaTemplate, 'utf-8');
      } catch {
        const rutaTemplate = join(
          process.cwd(),
          'src/app/features/contactos/pages/contacto-ficha.component.html',
        );
        return readFileSync(rutaTemplate, 'utf-8');
      }
    }

    it('no existe ninguna pestaña "Prospectos" en la plantilla (eliminación completa, no oculta con *ngIf)', () => {
      const html = leerTemplate();

      expect(html).not.toMatch(/title=["']Prospectos["']/);
      expect(html).not.toContain('PROSPECTOS</div>');
    });

    it('la pestaña "Representantes" existe y está condicionada por *ngIf="contacto.tipoContacto === \'JURIDICA\'"', () => {
      const html = leerTemplate();

      // Debe existir un <fd-tab ...> con ambos atributos (el orden
      // exacto de atributos no es relevante para esta afirmación).
      const bloqueRepresentantes = /<fd-tab\s+[^>]*title=["']Representantes["'][^>]*>/.exec(html);

      expect(bloqueRepresentantes).not.toBeNull();
      expect(bloqueRepresentantes?.[0]).toContain(
        `*ngIf="contacto.tipoContacto === 'JURIDICA'"`,
      );
    });

    it('el componente app-contacto-representantes se integra recibiendo [contactoId]="contactoId"', () => {
      const html = leerTemplate();

      expect(html).toMatch(/<app-contacto-representantes\s+\[contactoId\]="contactoId">/);
    });

    it('las demás pestañas (Cliente/Ubicación/Actividad/Patrimoniales/Cuentas bancarias/Notas) siguen presentes, sin *ngIf (Fase Representantes no las modifica)', () => {
      const html = leerTemplate();

      for (const titulo of [
        'Cliente',
        'Ubicación',
        'Actividad',
        'Patrimoniales',
        'Cuentas bancarias',
        'Notas',
      ]) {
        const regex = new RegExp(`<fd-tab title=["']${titulo}["']>`);
        expect(html).toMatch(regex);
      }
    });
  });

  // 📌 Fase "Patrón definitivo de guardado" -- Cliente/Ubicación:
  // edición local, Guardar explícito, sin autoguardado, detección de
  // cambios sin guardar y confirmación al intentar abandonar con
  // cambios pendientes (ver auditoría entregada antes de esta
  // implementación).
  describe('ContactoFichaComponent -- Patrón definitivo de guardado (cambios sin guardar / confirmación de navegación)', () => {
    it('sin ediciones, hayCambiosSinGuardar() es false', () => {
      const { component } = crearComponente();

      expect(component.hayCambiosSinGuardar()).toBe(false);
    });

    it('editar un campo de Cliente sin pulsar Guardar -> hayCambiosSinGuardar() es true, y NO ejecuta ningún PATCH (sin autoguardado)', () => {
      const { component, llamadasActualizar } = crearComponente();

      component.contacto.nombres = 'Cambiado';

      expect(component.hayCambiosSinGuardar()).toBe(true);
      expect(llamadasActualizar.length).toBe(0);
    });

    it('canDeactivate() sin cambios pendientes: devuelve true de inmediato, sin abrir ningún diálogo', () => {
      const { component, obtenerUltimoDialogData } = crearComponente();

      const resultado = component.canDeactivate();

      expect(resultado).toBe(true);
      expect(obtenerUltimoDialogData()).toBeNull();
    });

    it('canDeactivate() con cambios pendientes: abre la confirmación "Tienes cambios sin guardar..." con los textos exactos de botón', () => {
      const { component, obtenerUltimoDialogData } = crearComponente();
      component.contacto.nombres = 'Cambiado';

      component.canDeactivate();

      const data = obtenerUltimoDialogData();
      expect(data).not.toBeNull();
      expect(data.message).toBe('Tienes cambios sin guardar. ¿Deseas salir sin guardar?');
      expect(data.cancelText).toBe('Seguir editando');
      expect(data.confirmText).toBe('Salir sin guardar');
    });

    it('"Seguir editando" (el diálogo cierra con false) cancela la navegación -- canDeactivate() emite false', () => {
      const { component, setRespuestaDialog } = crearComponente();
      component.contacto.nombres = 'Cambiado';
      setRespuestaDialog(false);

      // 📌 dialogRef.afterClosed es `of(respuestaDialog)` (ver stub en
      // crearComponente()) -- un Observable SÍNCRONO, así que
      // `.subscribe()` ya invocó el callback cuando esta línea
      // termina de ejecutarse; no hace falta `done()`.
      let puedeSalir: boolean | undefined;
      (component.canDeactivate() as Observable<boolean>).subscribe((valor) => {
        puedeSalir = valor;
      });

      expect(puedeSalir).toBe(false);
    });

    it('"Salir sin guardar" (el diálogo cierra con true) permite la navegación -- canDeactivate() emite true', () => {
      const { component, setRespuestaDialog } = crearComponente();
      component.contacto.nombres = 'Cambiado';
      setRespuestaDialog(true);

      let puedeSalir: boolean | undefined;
      (component.canDeactivate() as Observable<boolean>).subscribe((valor) => {
        puedeSalir = valor;
      });

      expect(puedeSalir).toBe(true);
    });

    it('guardarCliente() exitoso: hayCambiosSinGuardar() vuelve a false (el guardado limpia el estado "sin guardar")', () => {
      const { component } = crearComponente();
      component.contactoId = '1';
      component.contacto = {
        ...component.contacto,
        tipoContacto: 'JURIDICA',
        razonSocial: 'Empresa SAC',
      };
      expect(component.hayCambiosSinGuardar()).toBe(true);

      component.guardarCliente();

      expect(component.hayCambiosSinGuardar()).toBe(false);
    });

    // 🔧 Regresión del hallazgo de auditoría de esta fase: antes,
    // guardarCliente()/guardarUbicacion() hacían `this.contacto =
    // actualizado` (reemplazo COMPLETO con la respuesta del Backend).
    // Si el usuario tenía, en memoria, una edición sin guardar en la
    // OTRA sección (Ubicación) en el momento de guardar Cliente, ese
    // reemplazo completo la perdía silenciosamente. Ahora solo se
    // parchean los campos que la sección guardada realmente envió.
    it('guardarCliente() exitoso NO descarta una edición sin guardar pendiente en Ubicación (celular)', () => {
      const { component, llamadasActualizar } = crearComponente();
      component.contactoId = '1';
      component.contacto = {
        ...component.contacto,
        tipoContacto: 'JURIDICA',
        razonSocial: 'Empresa SAC',
        celular: '999111222', // edición sin guardar en Ubicación
      };

      component.guardarCliente();

      const [, payloadEnviado] = llamadasActualizar[0];
      expect('celular' in payloadEnviado).toBe(false);
      expect(component.contacto.celular).toBe('999111222');
    });
  });
});
