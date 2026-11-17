/**
 * Fase Direcciones -- cobertura de `DireccionModalComponent`.
 *
 * Mismo criterio que contacto-modal.component.spec.ts: se instancia el
 * componente con `new` (evita depender de TestBed/compilación de
 * plantilla -- innecesario para lógica TypeScript pura) y se usan
 * stubs mínimos, sin spies de ningún framework de testing (mismo
 * criterio del resto del proyecto: "no zone.js", sin
 * jasmine.createSpy/fakeAsync). `ejecutarBusqueda()` (privado) se
 * invoca directamente vía notación de corchetes -- así la búsqueda se
 * prueba sin depender de que pase el debounce real de RxJS.
 */
import { of, throwError } from 'rxjs';

import { DireccionModalComponent, DireccionModalData } from './direccion-modal.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { UbigeoService } from '../../../core/services/ubigeo.service';
import { Direccion, Distrito } from '../interfaces/direccion.interface';

const distritoMiraflores: Distrito = {
  idDistrito: 1501,
  distrito: 'MIRAFLORES',
  provincia: 'LIMA',
  departamento: 'LIMA',
};

const direccionExistente: Direccion = {
  idDireccion: 7,
  idContacto: 10,
  idDistrito: 1501,
  distrito: 'MIRAFLORES',
  provincia: 'LIMA',
  departamento: 'LIMA',
  calle: 'Av. Javier Prado Este',
  numero: '1234',
  departamentoInterior: 'Dpto 402',
  activo: true,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaModificacion: null,
};

function crearComponente(data: DireccionModalData) {
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
    crearDireccion: (contactoId: string, payload: any) => {
      ultimoPayloadCrear = { contactoId, payload };
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },

    actualizarDireccion: (contactoId: string, direccionId: number, payload: any) => {
      ultimoPayloadActualizar = { contactoId, direccionId, payload };
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },
  } as unknown as ContactosService;

  let ultimaBusqueda: string | null = null;
  let respuestaBusqueda: any = [];
  let busquedaLanzaError: any = null;

  const ubigeoServiceStub = {
    buscarDistritos: (search: string) => {
      ultimaBusqueda = search;
      return busquedaLanzaError ? throwError(() => busquedaLanzaError) : of(respuestaBusqueda);
    },
  } as unknown as UbigeoService;

  let llamadasDetectChanges = 0;
  const cdrStub = {
    detectChanges: () => {
      llamadasDetectChanges++;
    },
    markForCheck: () => {},
  } as any;

  const component = new DireccionModalComponent(
    dialogRefStub,
    contactosServiceStub,
    ubigeoServiceStub,
    cdrStub,
  );

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
    setRespuestaBusqueda: (valor: any) => {
      respuestaBusqueda = valor;
    },
    setBusquedaError: (valor: any) => {
      busquedaLanzaError = valor;
    },
    obtenerUltimoPayloadCrear: () => ultimoPayloadCrear,
    obtenerUltimoPayloadActualizar: () => ultimoPayloadActualizar,
    obtenerUltimaBusqueda: () => ultimaBusqueda,
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
    fueCerradoCon: () => cerradoCon,
  };
}

describe('DireccionModalComponent -- modo alta / edición (ngOnInit)', () => {
  it('modo alta: model queda vacío y esEdicion es false', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });

    component.ngOnInit();

    expect(component.esEdicion).toBe(false);
    expect(component.model.distritoSeleccionado).toBeNull();
    expect(component.model.calle).toBe('');
  });

  it('modo edición: precarga Distrito (con provincia/departamento) / Calle / Número / Departamento-Interior', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: direccionExistente });

    component.ngOnInit();

    expect(component.esEdicion).toBe(true);
    expect(component.model.distritoSeleccionado).toEqual(distritoMiraflores);
    expect(component.model.calle).toBe('Av. Javier Prado Este');
    expect(component.model.numero).toBe('1234');
    expect(component.model.departamentoInterior).toBe('Dpto 402');
  });
});

describe('DireccionModalComponent -- formatearDistrito ("DISTRITO, PROVINCIA, DEPARTAMENTO")', () => {
  it('formatea un distrito como "DISTRITO, PROVINCIA, DEPARTAMENTO"', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });

    expect(component.formatearDistrito(distritoMiraflores)).toBe('MIRAFLORES, LIMA, LIMA');
  });

  it('devuelve cadena vacía cuando no hay distrito', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });

    expect(component.formatearDistrito(null)).toBe('');
  });
});

describe('DireccionModalComponent -- búsqueda de distrito', () => {
  it('busca en el Backend (nunca localmente) cuando el texto tiene 2+ caracteres', () => {
    const { component, setRespuestaBusqueda, obtenerUltimaBusqueda } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    setRespuestaBusqueda([distritoMiraflores]);

    (component as any).ejecutarBusqueda('mira');

    expect(obtenerUltimaBusqueda()).toBe('mira');
    expect(component.distritosEncontrados).toEqual([distritoMiraflores]);
    expect(component.buscandoDistritos).toBe(false);
  });

  it('sin resultados -> distritosEncontrados queda vacío, sin error', () => {
    const { component, setRespuestaBusqueda } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    setRespuestaBusqueda([]);

    (component as any).ejecutarBusqueda('zzzzz');

    expect(component.distritosEncontrados).toEqual([]);
  });

  it('texto de menos de 2 caracteres no dispara la búsqueda contra el Backend', () => {
    const { component, obtenerUltimaBusqueda } = crearComponente({
      contactoId: '10',
      direccion: null,
    });

    (component as any).ejecutarBusqueda('m');

    expect(obtenerUltimaBusqueda()).toBeNull();
    expect(component.distritosEncontrados).toEqual([]);
  });

  it('error del Backend al buscar -> no rompe el modal, deja el desplegable vacío', () => {
    const { component, setBusquedaError } = crearComponente({ contactoId: '10', direccion: null });
    setBusquedaError({ status: 500 });

    (component as any).ejecutarBusqueda('mira');

    expect(component.distritosEncontrados).toEqual([]);
    expect(component.buscandoDistritos).toBe(false);
  });
});

describe('DireccionModalComponent -- guardar() / validación', () => {
  it('bloquea el guardado sin distrito seleccionado, con el mensaje específico bajo el campo', () => {
    const { component, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    component.model = { distritoSeleccionado: null, calle: 'Av. Test', numero: '123', departamentoInterior: '' };

    component.guardar();

    expect(component.errores.distrito).toBe('Selecciona un distrito válido.');
    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });

  it('bloquea el guardado sin calle', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: '',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errores.calle).toBeTruthy();
  });

  it('bloquea el guardado sin número', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errores.numero).toBeTruthy();
  });

  it('escribir texto libre sin seleccionar un distrito real deja distritoSeleccionado en null -> mismo bloqueo', () => {
    const { component } = crearComponente({ contactoId: '10', direccion: null });
    // Simula lo que hace fd-combobox con communicateByObject=true: si
    // el texto no coincide con ningún item, el ngModel nunca se
    // actualiza -- el modelo conserva null.
    component.model = {
      distritoSeleccionado: null,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errores.distrito).toBe('Selecciona un distrito válido.');
  });
});

describe('DireccionModalComponent -- guardar() / creación', () => {
  it('crea la dirección con el payload correcto (idDistrito preservado, sin campos técnicos) y cierra el modal con true', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear, fueCerradoCon } =
      crearComponente({ contactoId: '10', direccion: null });
    setRespuestaExito({ idDireccion: 1 });

    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Javier Prado Este',
      numero: '1234',
      departamentoInterior: 'Dpto 402',
    };

    component.guardar();

    expect(obtenerUltimoPayloadCrear()).toEqual({
      contactoId: '10',
      payload: {
        idDistrito: 1501,
        calle: 'Av. Javier Prado Este',
        numero: '1234',
        departamentoInterior: 'Dpto 402',
      },
    });
    expect(fueCerradoCon()).toBe(true);
    expect(component.guardando).toBe(false);
  });

  it('departamentoInterior vacío se envía como undefined (opcional, nunca cadena vacía)', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    setRespuestaExito({ idDireccion: 1 });

    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '   ',
    };

    component.guardar();

    expect(obtenerUltimoPayloadCrear().payload.departamentoInterior).toBeUndefined();
  });

  it('mientras guardando=true, un segundo guardar() no reenvía la solicitud', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    setRespuestaExito({ idDireccion: 1 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };
    component.guardando = true;

    component.guardar();

    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });
});

describe('DireccionModalComponent -- guardar() / edición', () => {
  it('actualiza la dirección existente (usa actualizarDireccion, no crearDireccion) y cierra el modal con true', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadActualizar, obtenerUltimoPayloadCrear, fueCerradoCon } =
      crearComponente({ contactoId: '10', direccion: direccionExistente });
    setRespuestaExito({ idDireccion: 7 });

    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Javier Prado Este 2',
      numero: '1235',
      departamentoInterior: '',
    };

    component.guardar();

    expect(obtenerUltimoPayloadActualizar()).toMatchObject({ contactoId: '10', direccionId: 7 });
    expect(obtenerUltimoPayloadCrear()).toBeNull();
    expect(fueCerradoCon()).toBe(true);
  });
});

describe('DireccionModalComponent -- guardar() / manejo de errores', () => {
  it('401/403 -> mensaje de autorización', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', direccion: null });
    setRespuestaError({ status: 403 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errorMessage).toContain('autorización');
    expect(component.guardando).toBe(false);
  });

  it('404 en creación -> "El contacto no fue encontrado."', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '999', direccion: null });
    setRespuestaError({ status: 404 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errorMessage).toBe('El contacto no fue encontrado.');
  });

  it('404 en edición -> "La dirección no fue encontrada."', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      direccion: direccionExistente,
    });
    setRespuestaError({ status: 404 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errorMessage).toBe('La dirección no fue encontrada.');
  });

  it('400 con fieldErrors del Backend -> se mapean a errores por campo (idDistrito -> distrito)', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', direccion: null });
    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de dirección inválidos',
        errors: {
          fieldErrors: {
            idDistrito: ['Selecciona un distrito válido'],
            calle: ['Calle es requerida'],
          },
        },
      },
    });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errores.distrito).toBe('Selecciona un distrito válido');
    expect(component.errores.calle).toBe('Calle es requerida');
    expect(component.errorMessage).toBe('');
  });

  it('400 sin fieldErrors (DireccionDistritoInvalidoError) -> se asocia al campo Distrito', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', direccion: null });
    setRespuestaError({
      status: 400,
      error: { message: 'El distrito seleccionado no es válido.' },
    });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errores.distrito).toBe('El distrito seleccionado no es válido.');
  });

  it('500 genérico -> mensaje de reintento', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', direccion: null });
    setRespuestaError({ status: 500 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(component.errorMessage).toContain('No fue posible guardar');
  });

  // 📌 Fase "Patrón definitivo de guardado" -- lista mínima de pruebas
  // requerida para Direcciones: "Error de API no cierra el modal."
  // Las pruebas de arriba ya comprueban errorMessage/guardando; esta
  // agrega explícitamente la comprobación de que `dialogRef.close()`
  // NUNCA se invoca ante un error del Backend (el modal permanece
  // abierto, con los datos del formulario intactos).
  it('un error del Backend NO cierra el modal (dialogRef.close no se invoca, los datos del formulario se conservan)', () => {
    const { component, setRespuestaError, fueCerradoCon } = crearComponente({
      contactoId: '10',
      direccion: null,
    });
    setRespuestaError({ status: 500 });
    component.model = {
      distritoSeleccionado: distritoMiraflores,
      calle: 'Av. Test',
      numero: '123',
      departamentoInterior: '',
    };

    component.guardar();

    expect(fueCerradoCon()).toBe('no-cerrado');
    expect(component.model.calle).toBe('Av. Test');
    expect(component.model.numero).toBe('123');
  });
});

describe('DireccionModalComponent -- cancelar()', () => {
  it('cierra el modal con false, sin llamar al service', () => {
    const { component, fueCerradoCon, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      direccion: null,
    });

    component.cancelar();

    expect(fueCerradoCon()).toBe(false);
    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });
});
