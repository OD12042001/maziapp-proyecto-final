/**
 * Fase Actividad -- cobertura de `ContactoActividadComponent`.
 *
 * Mismo criterio que contacto-direcciones.component.spec.ts /
 * direccion-modal.component.spec.ts: instanciación con `new` (sin
 * TestBed), stubs mínimos, observables síncronos.
 *
 * 🔐 ETAPA 5 (arquitectura independiente de Trabajos Dependientes):
 * este spec reemplaza por completo la cobertura anterior de
 * `trabajosNuevos`/`filasTrabajos`/`agregarTrabajo()` en memoria --
 * ahora Trabajos Dependientes es un recurso HTTP independiente, cargado
 * vía `obtenerTrabajosDependientes` y mutado vía el modal (agregar/
 * editar) o `desactivarTrabajoDependiente` (eliminar), siempre seguido
 * de una recarga real -- mismo patrón que
 * contacto-direcciones.component.spec.ts. Cubre además que "Guardar"
 * de Actividad NUNCA envía nada de Trabajos Dependientes, y que
 * NATURAL/JURIDICA se resuelve solo desde la respuesta del Backend.
 */
import { of, throwError, Subject } from 'rxjs';

import { ContactoActividadComponent } from './contacto-actividad.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { CiiuService } from '../../../core/services/ciiu.service';
import { ContactoActividadRespuesta, TrabajoDependiente } from '../interfaces/actividad.interface';

const respuestaNaturalVacia: ContactoActividadRespuesta = {
  tipoContacto: 'NATURAL',
  actividad: null,
};

const respuestaJuridicaVacia: ContactoActividadRespuesta = {
  tipoContacto: 'JURIDICA',
  actividad: null,
};

const trabajo1: TrabajoDependiente = {
  id: '1',
  contactoId: '10',
  empresa: { tipo: 'LIBRE', contactoId: null, nombre: 'Acme SAC' },
  cargo: 'Analista',
  desde: '2020-01-01',
  hasta: null,
  creado: { fecha: null, nombre: null },
};

function crearComponente() {
  let ultimaObtenerActividad: string | null = null;
  let respuestaObtenerActividad: any = respuestaNaturalVacia;
  let obtenerActividadLanzaError: any = null;

  let ultimaObtenerTrabajos: string | null = null;
  let obtenerTrabajosLlamado = false;
  let respuestaObtenerTrabajos: any[] = [];
  let obtenerTrabajosLanzaError: any = null;

  let ultimoDesactivarTrabajo: any = null;
  let respuestaDesactivarTrabajoError: any = null;
  let desactivarTrabajoLanzaError = false;

  let ultimoPayloadNatural: any = null;
  let ultimoPayloadJuridica: any = null;
  let respuestaGuardar: any = null;
  let guardarLanzaError: any = null;

  const contactosServiceStub = {
    obtenerActividad: (contactoId: string) => {
      ultimaObtenerActividad = contactoId;
      return obtenerActividadLanzaError
        ? throwError(() => obtenerActividadLanzaError)
        : of(respuestaObtenerActividad);
    },

    obtenerTrabajosDependientes: (contactoId: string) => {
      obtenerTrabajosLlamado = true;
      ultimaObtenerTrabajos = contactoId;
      return obtenerTrabajosLanzaError
        ? throwError(() => obtenerTrabajosLanzaError)
        : of(respuestaObtenerTrabajos);
    },

    desactivarTrabajoDependiente: (contactoId: string, trabajoId: string) => {
      ultimoDesactivarTrabajo = { contactoId, trabajoId };
      return desactivarTrabajoLanzaError ? throwError(() => respuestaDesactivarTrabajoError) : of(undefined);
    },

    guardarActividadNatural: (contactoId: string, data: any) => {
      ultimoPayloadNatural = { contactoId, data };
      return guardarLanzaError ? throwError(() => guardarLanzaError) : of(respuestaGuardar);
    },

    guardarActividadJuridica: (contactoId: string, data: any) => {
      ultimoPayloadJuridica = { contactoId, data };
      return guardarLanzaError ? throwError(() => guardarLanzaError) : of(respuestaGuardar);
    },

    buscarEmpresas: () => of([]),
  } as unknown as ContactosService;

  const ciiuServiceStub = {
    buscarCiiu: () => of([]),
  } as unknown as CiiuService;

  let dialogAbierto = false;
  let ultimaAperturaData: any = null;
  const afterClosedSubject = new Subject<unknown>();
  const dialogServiceStub = {
    open: (_component: unknown, config: any) => {
      dialogAbierto = true;
      ultimaAperturaData = config?.data;
      return { afterClosed: afterClosedSubject.asObservable() } as any;
    },
  } as any;

  const cdrStub = {
    detectChanges: () => {},
    markForCheck: () => {},
  } as any;

  const component = new ContactoActividadComponent(
    contactosServiceStub,
    ciiuServiceStub,
    dialogServiceStub,
    cdrStub,
  );

  return {
    component,
    setRespuestaObtenerActividad: (valor: any) => {
      respuestaObtenerActividad = valor;
    },
    setObtenerActividadError: (valor: any) => {
      obtenerActividadLanzaError = valor;
    },
    setRespuestaObtenerTrabajos: (valor: any[]) => {
      respuestaObtenerTrabajos = valor;
    },
    setObtenerTrabajosError: (valor: any) => {
      obtenerTrabajosLanzaError = valor;
    },
    setDesactivarTrabajoError: (valor: any) => {
      desactivarTrabajoLanzaError = true;
      respuestaDesactivarTrabajoError = valor;
    },
    setRespuestaGuardar: (valor: any) => {
      respuestaGuardar = valor;
    },
    setGuardarError: (valor: any) => {
      guardarLanzaError = valor;
    },
    fueObtenerTrabajosLlamado: () => obtenerTrabajosLlamado,
    obtenerUltimaObtenerActividad: () => ultimaObtenerActividad,
    obtenerUltimaObtenerTrabajos: () => ultimaObtenerTrabajos,
    obtenerUltimoDesactivarTrabajo: () => ultimoDesactivarTrabajo,
    obtenerUltimoPayloadNatural: () => ultimoPayloadNatural,
    obtenerUltimoPayloadJuridica: () => ultimoPayloadJuridica,
    fueDialogAbierto: () => dialogAbierto,
    obtenerUltimaAperturaData: () => ultimaAperturaData,
    emitirCierreModal: (resultado: unknown) => afterClosedSubject.next(resultado),
  };
}

function disparar(component: ContactoActividadComponent, contactoId: string): void {
  component.contactoId = contactoId;
  component.ngOnChanges({
    contactoId: { currentValue: contactoId, previousValue: '', firstChange: true, isFirstChange: () => true },
  } as any);
}

describe('ContactoActividadComponent -- carga (ngOnChanges)', () => {
  it('con contactoId, consulta obtenerActividad y resuelve tipoContacto desde la respuesta (nunca supuesto)', () => {
    const { component, setRespuestaObtenerActividad, obtenerUltimaObtenerActividad } = crearComponente();
    setRespuestaObtenerActividad(respuestaJuridicaVacia);

    disparar(component, '20');

    expect(obtenerUltimaObtenerActividad()).toBe('20');
    expect(component.tipoContacto).toBe('JURIDICA');
  });

  it('sin contactoId (cadena vacía) no consulta al Backend', () => {
    const { component, obtenerUltimaObtenerActividad } = crearComponente();

    component.contactoId = '';
    component.ngOnChanges({
      contactoId: { currentValue: '', previousValue: undefined, firstChange: true, isFirstChange: () => true },
    } as any);

    expect(obtenerUltimaObtenerActividad()).toBeNull();
    expect(component.tipoContacto).toBeNull();
  });

  it('NATURAL: además de Grado/Profesión, consulta GET /trabajos-dependientes y muestra la lista devuelta', () => {
    const { component, setRespuestaObtenerActividad, setRespuestaObtenerTrabajos, obtenerUltimaObtenerTrabajos } =
      crearComponente();
    setRespuestaObtenerActividad({
      tipoContacto: 'NATURAL',
      actividad: {
        contactoId: '10',
        gradoInstruccion: 'TECNICO',
        profesionOcupacion: 'Contador',
        ciiuId: null,
        ciiuCodigo: null,
        ciiuDescripcion: null,
        creado: { fecha: null, nombre: null, correo: null, id: null },
        actualizado: null,
      },
    });
    setRespuestaObtenerTrabajos([trabajo1]);

    disparar(component, '10');

    expect(component.gradoInstruccion).toBe('TECNICO');
    expect(component.profesionOcupacion).toBe('Contador');
    expect(obtenerUltimaObtenerTrabajos()).toBe('10');
    expect(component.trabajos).toEqual([trabajo1]);
    expect(component.cargandoTrabajos).toBe(false);
  });

  it('JURIDICA: precarga ciiuSeleccionado y NO consulta /trabajos-dependientes', () => {
    const { component, setRespuestaObtenerActividad, fueObtenerTrabajosLlamado } = crearComponente();
    setRespuestaObtenerActividad({
      tipoContacto: 'JURIDICA',
      actividad: {
        contactoId: '20',
        gradoInstruccion: null,
        profesionOcupacion: null,
        ciiuId: 12,
        ciiuCodigo: '6201',
        ciiuDescripcion: 'Programación informática',
        creado: { fecha: null, nombre: null, correo: null, id: null },
        actualizado: null,
      },
    });

    disparar(component, '20');

    expect(component.ciiuSeleccionado).toEqual({ ciiuId: 12, codigo: '6201', descripcion: 'Programación informática' });
    expect(fueObtenerTrabajosLlamado()).toBe(false);
    expect(component.trabajos).toEqual([]);
  });

  it('error del Backend al cargar Actividad -> mensaje de error, sin romper el componente', () => {
    const { component, setObtenerActividadError } = crearComponente();
    setObtenerActividadError({ status: 500 });

    disparar(component, '10');

    expect(component.mensaje?.tipo).toBe('error');
    expect(component.cargando).toBe(false);
  });

  it('error del Backend al cargar Trabajos Dependientes -> no rompe el componente, cargandoTrabajos vuelve a false', () => {
    const { component, setObtenerTrabajosError } = crearComponente();
    setObtenerTrabajosError({ status: 500 });

    disparar(component, '10');

    expect(component.cargandoTrabajos).toBe(false);
    expect(component.trabajos).toEqual([]);
  });
});

describe('ContactoActividadComponent -- Trabajos Dependientes / agregar', () => {
  it('"+" abre el modal con { contactoId, trabajo: null }', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    disparar(component, '10');

    component.agregarTrabajo();

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', trabajo: null });
  });

  it('no abre el modal sin contactoId', () => {
    const { component, fueDialogAbierto } = crearComponente();
    component.contactoId = '';

    component.agregarTrabajo();

    expect(fueDialogAbierto()).toBe(false);
  });

  it('al cerrar el modal con true, recarga la lista mediante GET (no agrega a ningún array temporal)', () => {
    const { component, setRespuestaObtenerTrabajos, emitirCierreModal } = crearComponente();
    disparar(component, '10');

    component.agregarTrabajo();
    setRespuestaObtenerTrabajos([trabajo1]);
    emitirCierreModal(true);

    expect(component.trabajos).toEqual([trabajo1]);
  });

  it('al cerrar el modal con false (Cancelar), NO recarga innecesariamente', () => {
    const { component, emitirCierreModal } = crearComponente();
    disparar(component, '10');

    component.agregarTrabajo();
    component.trabajos = [trabajo1]; // fuerza un estado distinguible antes de "cerrar"
    emitirCierreModal(false);

    expect(component.trabajos).toEqual([trabajo1]);
  });

  it('al cerrar el modal con undefined (Escape/backdrop), tampoco recarga', () => {
    const { component, emitirCierreModal } = crearComponente();
    disparar(component, '10');

    component.agregarTrabajo();
    component.trabajos = [trabajo1]; // estado distinguible previo al cierre
    emitirCierreModal(undefined);

    expect(component.trabajos).toEqual([trabajo1]);
  });

  it('el componente ya no mantiene un array temporal "trabajosNuevos"', () => {
    const { component } = crearComponente();

    expect((component as any).trabajosNuevos).toBeUndefined();
  });
});

describe('ContactoActividadComponent -- Trabajos Dependientes / editar', () => {
  it('el botón editar abre el modal pasando el trabajo existente y el contactoId', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    disparar(component, '10');

    component.editarTrabajo(trabajo1);

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', trabajo: trabajo1 });
  });

  it('al cerrar el modal de edición con true, recarga la lista mediante GET', () => {
    const { component, setRespuestaObtenerTrabajos, emitirCierreModal } = crearComponente();
    disparar(component, '10');
    const trabajoEditado = { ...trabajo1, cargo: 'Analista Senior' };

    component.editarTrabajo(trabajo1);
    setRespuestaObtenerTrabajos([trabajoEditado]);
    emitirCierreModal(true);

    expect(component.trabajos).toEqual([trabajoEditado]);
  });
});

describe('ContactoActividadComponent -- Trabajos Dependientes / eliminar', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('pide confirmación antes de desactivar; si el usuario cancela, no llama al Backend', () => {
    window.confirm = () => false;
    const { component, obtenerUltimoDesactivarTrabajo } = crearComponente();
    disparar(component, '10');

    component.desactivarTrabajo(trabajo1);

    expect(obtenerUltimoDesactivarTrabajo()).toBeNull();
  });

  it('si el usuario confirma, desactiva el trabajo y recarga la lista mediante GET', () => {
    window.confirm = () => true;
    const { component, setRespuestaObtenerTrabajos, obtenerUltimoDesactivarTrabajo } = crearComponente();
    disparar(component, '10');
    setRespuestaObtenerTrabajos([]);

    component.desactivarTrabajo(trabajo1);

    expect(obtenerUltimoDesactivarTrabajo()).toEqual({ contactoId: '10', trabajoId: '1' });
    expect(component.trabajos).toEqual([]);
  });

  it('error al desactivar -> NO elimina la fila artificialmente, muestra el error', () => {
    window.confirm = () => true;
    const { component, setRespuestaObtenerTrabajos, setDesactivarTrabajoError } = crearComponente();
    setRespuestaObtenerTrabajos([trabajo1]);
    disparar(component, '10');
    setDesactivarTrabajoError({ status: 500 });

    component.desactivarTrabajo(trabajo1);

    expect(component.trabajos).toEqual([trabajo1]);
    expect(component.errorTrabajos).toContain('No fue posible desactivar');
  });

  it('401/403 al desactivar -> mensaje de autorización', () => {
    window.confirm = () => true;
    const { component, setDesactivarTrabajoError } = crearComponente();
    disparar(component, '10');
    setDesactivarTrabajoError({ status: 403 });

    component.desactivarTrabajo(trabajo1);

    expect(component.errorTrabajos).toContain('autorización');
  });
});

describe('ContactoActividadComponent -- validación de guardar()', () => {
  it('NATURAL: bloquea sin gradoInstruccion', () => {
    const { component } = crearComponente();
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = null;
    component.profesionOcupacion = 'Contador';

    component.guardar();

    expect(component.errores.gradoInstruccion).toBeTruthy();
  });

  it('NATURAL: bloquea sin profesionOcupacion', () => {
    const { component } = crearComponente();
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = '   ';

    component.guardar();

    expect(component.errores.profesionOcupacion).toBeTruthy();
  });

  it('JURIDICA: bloquea sin ciiuSeleccionado', () => {
    const { component } = crearComponente();
    component.tipoContacto = 'JURIDICA';
    component.ciiuSeleccionado = null;

    component.guardar();

    expect(component.errores.ciiu).toBeTruthy();
  });

  it('sin tipoContacto resuelto (todavía cargando), guardar() no hace nada', () => {
    const { component, obtenerUltimoPayloadNatural, obtenerUltimoPayloadJuridica } = crearComponente();
    component.tipoContacto = null;

    component.guardar();

    expect(obtenerUltimoPayloadNatural()).toBeNull();
    expect(obtenerUltimoPayloadJuridica()).toBeNull();
  });
});

describe('ContactoActividadComponent -- guardar() NATURAL (Actividad, sin Trabajos Dependientes)', () => {
  it('envía ÚNICAMENTE gradoInstruccion + profesionOcupacion -- nunca trabajosNuevos/trabajosModificados/trabajosEliminados', () => {
    const { component, setRespuestaGuardar, obtenerUltimoPayloadNatural, obtenerUltimoPayloadJuridica } =
      crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'SUPERIOR';
    component.profesionOcupacion = 'Ingeniero';
    setRespuestaGuardar({ tipoContacto: 'NATURAL', actividad: { contactoId: '10' } });

    component.guardar();

    expect(obtenerUltimoPayloadNatural()).toEqual({
      contactoId: '10',
      data: { gradoInstruccion: 'SUPERIOR', profesionOcupacion: 'Ingeniero' },
    });
    expect(obtenerUltimoPayloadNatural()?.data.trabajosNuevos).toBeUndefined();
    expect(obtenerUltimoPayloadNatural()?.data.trabajosModificados).toBeUndefined();
    expect(obtenerUltimoPayloadNatural()?.data.trabajosEliminados).toBeUndefined();
    expect(obtenerUltimoPayloadJuridica()).toBeNull();
  });

  it('éxito: muestra el mensaje de éxito y no toca el estado de Trabajos Dependientes', () => {
    const { component, setRespuestaGuardar } = crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    component.trabajos = [trabajo1];
    setRespuestaGuardar({ tipoContacto: 'NATURAL', actividad: { contactoId: '10' } });

    component.guardar();

    expect(component.mensaje?.tipo).toBe('exito');
    expect(component.guardando).toBe(false);
    // Guardar Actividad es un flujo independiente de Trabajos
    // Dependientes -- no debe alterar `trabajos`.
    expect(component.trabajos).toEqual([trabajo1]);
  });

  it('mientras guardando=true, un segundo guardar() no reenvía la solicitud', () => {
    const { component, setRespuestaGuardar, obtenerUltimoPayloadNatural } = crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    component.guardando = true;
    setRespuestaGuardar({ tipoContacto: 'NATURAL', actividad: { contactoId: '10' } });

    component.guardar();

    expect(obtenerUltimoPayloadNatural()).toBeNull();
  });
});

describe('ContactoActividadComponent -- guardar() JURIDICA', () => {
  it('envía únicamente ciiuId', () => {
    const { component, setRespuestaGuardar, obtenerUltimoPayloadJuridica, obtenerUltimoPayloadNatural } =
      crearComponente();
    component.contactoId = '20';
    component.tipoContacto = 'JURIDICA';
    component.ciiuSeleccionado = { ciiuId: 12, codigo: '6201', descripcion: 'Programación informática' };
    setRespuestaGuardar({ tipoContacto: 'JURIDICA', actividad: { contactoId: '20', ciiuId: 12 } });

    component.guardar();

    expect(obtenerUltimoPayloadJuridica()).toEqual({ contactoId: '20', data: { ciiuId: 12 } });
    expect(obtenerUltimoPayloadNatural()).toBeNull();
  });
});

describe('ContactoActividadComponent -- guardar() / manejo de errores', () => {
  it('401/403 -> mensaje de autorización', () => {
    const { component, setGuardarError } = crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    setGuardarError({ status: 403 });

    component.guardar();

    expect(component.mensaje?.texto).toContain('autorización');
  });

  it('404 -> "El contacto no fue encontrado."', () => {
    const { component, setGuardarError } = crearComponente();
    component.contactoId = '999';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    setGuardarError({ status: 404 });

    component.guardar();

    expect(component.mensaje?.texto).toBe('El contacto no fue encontrado.');
  });

  it('400 con fieldErrors -> se mapean a errores por campo', () => {
    const { component, setGuardarError } = crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    setGuardarError({
      status: 400,
      error: { errors: { fieldErrors: { gradoInstruccion: ['Grado de instrucción inválido'] } } },
    });

    component.guardar();

    expect(component.errores.gradoInstruccion).toBe('Grado de instrucción inválido');
  });

  it('400 sin fieldErrors (error de negocio: CIIU/Tipo incorrecto) -> mensaje devuelto por el Backend', () => {
    const { component, setGuardarError } = crearComponente();
    component.contactoId = '20';
    component.tipoContacto = 'JURIDICA';
    component.ciiuSeleccionado = { ciiuId: 999, codigo: '9999', descripcion: 'x' };
    setGuardarError({ status: 400, error: { message: 'El CIIU seleccionado no es válido.' } });

    component.guardar();

    expect(component.mensaje?.texto).toBe('El CIIU seleccionado no es válido.');
  });

  it('500 genérico -> mensaje de reintento', () => {
    const { component, setGuardarError } = crearComponente();
    component.contactoId = '10';
    component.tipoContacto = 'NATURAL';
    component.gradoInstruccion = 'TECNICO';
    component.profesionOcupacion = 'Contador';
    setGuardarError({ status: 500 });

    component.guardar();

    expect(component.mensaje?.texto).toContain('Inténtalo nuevamente');
  });
});

describe('ContactoActividadComponent -- NATURAL/JURIDICA (visibilidad de Trabajos Dependientes)', () => {
  it('JURIDICA: trabajos queda vacío y no se consulta /trabajos-dependientes (la plantilla, con *ngIf="tipoContacto===\'NATURAL\'", nunca muestra la tabla ni el "+")', () => {
    const { component, setRespuestaObtenerActividad, fueObtenerTrabajosLlamado } = crearComponente();
    setRespuestaObtenerActividad(respuestaJuridicaVacia);

    disparar(component, '20');

    expect(component.tipoContacto).toBe('JURIDICA');
    expect(component.trabajos).toEqual([]);
    expect(fueObtenerTrabajosLlamado()).toBe(false);
  });
});
