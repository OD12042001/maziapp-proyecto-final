/**
 * Fase Representantes (Edición) -- cobertura de
 * `RepresentanteModalComponent`.
 *
 * Mismo criterio que direccion-modal.component.spec.ts /
 * contacto-modal.component.spec.ts: se instancia el componente con
 * `new` (evita depender de TestBed/compilación de plantilla), con
 * stubs mínimos (closures), sin spies de ningún framework de testing.
 */
import { of, throwError } from 'rxjs';

import { RepresentanteModalComponent, RepresentanteModalData } from './representante-modal.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { Representante } from '../interfaces/representante.interface';

const representanteExistente: Representante = {
  contactoRepresentanteId: '900',
  representanteId: '5',
  tipoDocumento: 'DNI',
  numeroDocumento: '12345678',
  nombres: 'Juan',
  apellidos: 'Pérez',
  cargo: 'Gerente General',
  celular: '999888777',
  correo: 'juan@example.com',
};

function crearComponente(data: RepresentanteModalData) {
  let cerradoCon: unknown = 'no-cerrado';
  const dialogRefStub = {
    data,
    close: (resultado?: unknown) => {
      cerradoCon = resultado;
    },
  } as any;

  let ultimoPayloadCrear: any = null;
  let ultimoPayloadActualizar: any = null;
  let respuestaError: any = null;
  let respuestaExito: any = null;
  let modoExito = false;

  const contactosServiceStub = {
    crearRepresentante: (contactoId: string, payload: any) => {
      ultimoPayloadCrear = { contactoId, payload };
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },

    actualizarRepresentante: (contactoId: string, representanteId: string, payload: any) => {
      ultimoPayloadActualizar = { contactoId, representanteId, payload };
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },
  } as unknown as ContactosService;

  let llamadasDetectChanges = 0;
  const cdrStub = {
    detectChanges: () => {
      llamadasDetectChanges++;
    },
    markForCheck: () => {},
  } as any;

  const component = new RepresentanteModalComponent(dialogRefStub, contactosServiceStub, cdrStub);

  return {
    component,
    setRespuestaError: (valor: any) => {
      modoExito = false;
      respuestaError = valor;
    },
    setRespuestaExito: (valor: any) => {
      modoExito = true;
      respuestaExito = valor;
    },
    obtenerUltimoPayloadCrear: () => ultimoPayloadCrear,
    obtenerUltimoPayloadActualizar: () => ultimoPayloadActualizar,
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
    fueCerradoCon: () => cerradoCon,
  };
}

function modeloValido() {
  return {
    tipoDocumento: 'DNI' as const,
    numeroDocumento: '12345678',
    nombres: 'Juan',
    apellidos: 'Pérez',
    cargo: 'Gerente General',
    celular: '',
    correo: '',
  };
}

describe('RepresentanteModalComponent -- modo alta / edición (ngOnInit)', () => {
  it('modo alta: model queda vacío y esEdicion es false', () => {
    const { component } = crearComponente({ contactoId: '10', representante: null });

    component.ngOnInit();

    expect(component.esEdicion).toBe(false);
    expect(component.model.tipoDocumento).toBe('DNI');
    expect(component.model.numeroDocumento).toBe('');
    expect(component.model.nombres).toBe('');
  });

  it('modo edición: precarga tipoDocumento/numeroDocumento/nombres/apellidos/cargo/celular/correo', () => {
    const { component } = crearComponente({
      contactoId: '10',
      representante: representanteExistente,
    });

    component.ngOnInit();

    expect(component.esEdicion).toBe(true);
    expect(component.model).toEqual({
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombres: 'Juan',
      apellidos: 'Pérez',
      cargo: 'Gerente General',
      celular: '999888777',
      correo: 'juan@example.com',
    });
  });

  it('modo edición con celular/correo null: se precargan como cadena vacía', () => {
    const { component } = crearComponente({
      contactoId: '10',
      representante: { ...representanteExistente, celular: null, correo: null },
    });

    component.ngOnInit();

    expect(component.model.celular).toBe('');
    expect(component.model.correo).toBe('');
  });
});

describe('RepresentanteModalComponent -- guardar() / validación', () => {
  it('modo alta: bloquea el guardado sin tipo/número de documento', () => {
    const { component, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    component.model = { ...modeloValido(), numeroDocumento: '' };

    component.guardar();

    expect(component.errores.numeroDocumento).toBeTruthy();
    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });

  it('modo edición: NO exige documento (es de solo lectura, no se valida)', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadActualizar } = crearComponente({
      contactoId: '10',
      representante: representanteExistente,
    });
    setRespuestaExito(representanteExistente);
    component.model = { ...modeloValido(), numeroDocumento: '' };

    component.guardar();

    expect(component.errores.numeroDocumento).toBeUndefined();
    expect(obtenerUltimoPayloadActualizar()).not.toBeNull();
  });

  it('bloquea el guardado sin nombres', () => {
    const { component } = crearComponente({ contactoId: '10', representante: null });
    component.model = { ...modeloValido(), nombres: '' };

    component.guardar();

    expect(component.errores.nombres).toBeTruthy();
  });

  it('bloquea el guardado sin apellidos', () => {
    const { component } = crearComponente({ contactoId: '10', representante: null });
    component.model = { ...modeloValido(), apellidos: '' };

    component.guardar();

    expect(component.errores.apellidos).toBeTruthy();
  });

  it('bloquea el guardado sin cargo', () => {
    const { component } = crearComponente({ contactoId: '10', representante: null });
    component.model = { ...modeloValido(), cargo: '' };

    component.guardar();

    expect(component.errores.cargo).toBeTruthy();
  });

  it('mientras guardando=true, un segundo guardar() no reenvía la solicitud', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaExito({});
    component.model = modeloValido();
    component.guardando = true;

    component.guardar();

    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });
});

describe('RepresentanteModalComponent -- guardar() / creación', () => {
  it('crea el representante con el payload correcto (sin campos técnicos) y cierra el modal con true', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear, fueCerradoCon } =
      crearComponente({ contactoId: '10', representante: null });
    setRespuestaExito(representanteExistente);

    component.model = modeloValido();

    component.guardar();

    expect(obtenerUltimoPayloadCrear()).toEqual({
      contactoId: '10',
      payload: {
        tipoDocumento: 'DNI',
        numeroDocumento: '12345678',
        nombres: 'Juan',
        apellidos: 'Pérez',
        cargo: 'Gerente General',
        celular: undefined,
        correo: undefined,
      },
    });
    expect(fueCerradoCon()).toBe(true);
    expect(component.guardando).toBe(false);
  });

  it('celular/correo vacíos se envían como undefined, nunca cadena vacía', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaExito(representanteExistente);
    component.model = { ...modeloValido(), celular: '   ', correo: '  ' };

    component.guardar();

    expect(obtenerUltimoPayloadCrear().payload.celular).toBeUndefined();
    expect(obtenerUltimoPayloadCrear().payload.correo).toBeUndefined();
  });
});

describe('RepresentanteModalComponent -- guardar() / edición', () => {
  it('actualiza el representante existente (usa actualizarRepresentante, no crearRepresentante), sin tipoDocumento/numeroDocumento en el payload, y cierra el modal con true', () => {
    const {
      component,
      setRespuestaExito,
      obtenerUltimoPayloadActualizar,
      obtenerUltimoPayloadCrear,
      fueCerradoCon,
    } = crearComponente({ contactoId: '10', representante: representanteExistente });
    setRespuestaExito(representanteExistente);

    component.ngOnInit();
    component.model.cargo = 'Gerente de Finanzas';

    component.guardar();

    expect(obtenerUltimoPayloadActualizar()).toEqual({
      contactoId: '10',
      representanteId: '5',
      payload: {
        nombres: 'Juan',
        apellidos: 'Pérez',
        cargo: 'Gerente de Finanzas',
        celular: '999888777',
        correo: 'juan@example.com',
      },
    });
    expect(obtenerUltimoPayloadCrear()).toBeNull();
    expect(fueCerradoCon()).toBe(true);
  });
});

describe('RepresentanteModalComponent -- guardar() / manejo de errores', () => {
  it('401/403 -> mensaje de autorización', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaError({ status: 403 });
    component.model = modeloValido();

    component.guardar();

    expect(component.errorMessage).toContain('autorización');
    expect(component.guardando).toBe(false);
  });

  it('404 en creación -> "El contacto no fue encontrado."', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '999',
      representante: null,
    });
    setRespuestaError({ status: 404 });
    component.model = modeloValido();

    component.guardar();

    expect(component.errorMessage).toBe('El contacto no fue encontrado.');
  });

  it('404 en edición -> "El representante no fue encontrado."', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      representante: representanteExistente,
    });
    setRespuestaError({ status: 404 });
    component.ngOnInit();

    component.guardar();

    expect(component.errorMessage).toBe('El representante no fue encontrado.');
  });

  it('409 (relación duplicada) -> usa el mensaje del Backend', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaError({
      status: 409,
      error: {
        message: 'Este representante ya está registrado como representante de esta empresa.',
      },
    });
    component.model = modeloValido();

    component.guardar();

    expect(component.errorMessage).toBe(
      'Este representante ya está registrado como representante de esta empresa.',
    );
  });

  it('400 con fieldErrors del Backend -> se mapean a errores por campo', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de representante inválidos',
        errors: {
          fieldErrors: {
            nombres: ['Nombres es requerido'],
            cargo: ['Cargo es requerido'],
          },
        },
      },
    });
    component.model = modeloValido();

    component.guardar();

    expect(component.errores.nombres).toBe('Nombres es requerido');
    expect(component.errores.cargo).toBe('Cargo es requerido');
    expect(component.errorMessage).toBe('');
  });

  it('500 genérico -> mensaje de reintento', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaError({ status: 500 });
    component.model = modeloValido();

    component.guardar();

    expect(component.errorMessage).toContain('No fue posible guardar');
  });

  // 📌 Fase "Patrón definitivo de guardado" -- lista mínima de pruebas
  // requerida para Representantes: "Error de API no cierra el
  // modal." Las pruebas de arriba ya comprueban errorMessage/
  // guardando; esta agrega explícitamente la comprobación de que
  // `dialogRef.close()` NUNCA se invoca ante un error del Backend (el
  // modal permanece abierto, con los datos del formulario intactos).
  it('un error del Backend NO cierra el modal (dialogRef.close no se invoca, los datos del formulario se conservan)', () => {
    const { component, setRespuestaError, fueCerradoCon } = crearComponente({
      contactoId: '10',
      representante: null,
    });
    setRespuestaError({ status: 500 });
    component.model = modeloValido();

    component.guardar();

    expect(fueCerradoCon()).toBe('no-cerrado');
    expect(component.model.nombres).toBe(modeloValido().nombres);
    expect(component.model.cargo).toBe(modeloValido().cargo);
  });
});

describe('RepresentanteModalComponent -- cancelar()', () => {
  it('cierra el modal con false, sin llamar al service', () => {
    const { component, fueCerradoCon, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      representante: null,
    });

    component.cancelar();

    expect(fueCerradoCon()).toBe(false);
    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });

  // 📌 Ficha Contacto -- pestaña Representantes (RUC/persona jurídica):
  // lista mínima de pruebas pedida para este ajuste -- "Abrir edición
  // de representante, modificar un campo, Cancelar, verificar que NO
  // se ejecutó PATCH/POST, verificar que el dato original permanece."
  // La prueba de arriba ya cubre Cancelar en modo ALTA; esta cubre
  // explícitamente el caso EDICIÓN con un campo modificado, y además
  // verifica que el objeto original (`representanteExistente`, tal
  // como llega en `dialogRef.data`) nunca se muta: `ngOnInit()` copia
  // sus valores a `model` (un objeto nuevo e independiente), nunca
  // conserva una referencia compartida -- por eso "el dato original
  // permanece" incluso antes de que el modal se cierre.
  it('modo edición: modificar un campo y Cancelar NO ejecuta PATCH, y el representante original no se modifica', () => {
    const representanteOriginal: Representante = { ...representanteExistente };
    const { component, obtenerUltimoPayloadActualizar, fueCerradoCon } = crearComponente({
      contactoId: '10',
      representante: representanteOriginal,
    });
    component.ngOnInit();

    // El usuario modifica campos en el formulario, sin guardar.
    component.model.nombres = 'Nombre Modificado Sin Guardar';
    component.model.cargo = 'Cargo Modificado Sin Guardar';

    component.cancelar();

    expect(obtenerUltimoPayloadActualizar()).toBeNull();
    expect(fueCerradoCon()).toBe(false);

    // El dato original (lo que representa lo ya persistido en BD)
    // permanece intacto -- nunca se llamó al service, y `model` nunca
    // fue una referencia compartida con este objeto.
    expect(representanteOriginal.nombres).toBe('Juan');
    expect(representanteOriginal.cargo).toBe('Gerente General');
  });
});
