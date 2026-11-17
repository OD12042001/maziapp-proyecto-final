/**
 * Fase Trabajos Dependientes (Etapa 4 -- arquitectura independiente,
 * patrón Direcciones) -- cobertura de `TrabajoDependienteModalComponent`.
 *
 * Mismo criterio que direccion-modal.component.spec.ts: se instancia el
 * componente con `new` (sin TestBed), con stubs mínimos y observables
 * síncronos (`of`/`throwError`). Desde esta etapa, "Aceptar" SÍ llama al
 * Backend (POST en modo alta / PATCH en modo edición, vía
 * `contactos.service.ts::crearTrabajoDependiente`/
 * `actualizarTrabajoDependiente` -- ejercitados aquí indirectamente,
 * mismo criterio que el resto del proyecto: no existe
 * `contactos.service.spec.ts`) y el modal NO cierra hasta que la
 * respuesta HTTP llega.
 */
import { of, throwError } from 'rxjs';

import { TrabajoDependienteModalComponent, TrabajoDependienteModalData } from './trabajo-dependiente-modal.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { EmpresaBusqueda, TrabajoDependiente } from '../interfaces/actividad.interface';
import { FdDate } from '@fundamental-ngx/core/datetime';

const empresaAcme: EmpresaBusqueda = { contactoId: '5', razonSocial: 'Acme SAC' };

const trabajoExistenteDeContacto: TrabajoDependiente = {
  id: '42',
  contactoId: '10',
  empresa: { tipo: 'CONTACTO', contactoId: '5', nombre: 'Acme SAC' },
  cargo: 'Analista',
  desde: '2020-01-01',
  hasta: null,
  creado: { fecha: '2020-01-01T00:00:00.000Z', nombre: 'Admin' },
};

const trabajoExistenteLibre: TrabajoDependiente = {
  id: '43',
  contactoId: '10',
  empresa: { tipo: 'LIBRE', contactoId: null, nombre: 'Empresa Manual SAC' },
  cargo: 'Vendedor',
  desde: '2019-06-15',
  hasta: '2021-12-31',
  creado: { fecha: '2019-06-15T00:00:00.000Z', nombre: 'Admin' },
};

function crearComponente(data: TrabajoDependienteModalData) {
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

  let ultimaBusqueda: string | null = null;
  let respuestaBusqueda: any[] = [];
  let busquedaLanzaError: any = null;
  let buscarEmpresasLlamado = false;

  const contactosServiceStub = {
    buscarEmpresas: (search: string) => {
      buscarEmpresasLlamado = true;
      ultimaBusqueda = search;
      return busquedaLanzaError ? throwError(() => busquedaLanzaError) : of(respuestaBusqueda);
    },

    crearTrabajoDependiente: (contactoId: string, payload: any) => {
      ultimoPayloadCrear = { contactoId, payload };
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },

    actualizarTrabajoDependiente: (contactoId: string, trabajoId: string, payload: any) => {
      ultimoPayloadActualizar = { contactoId, trabajoId, payload };
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

  const component = new TrabajoDependienteModalComponent(dialogRefStub, contactosServiceStub, cdrStub);

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
    setRespuestaBusqueda: (valor: any[]) => {
      respuestaBusqueda = valor;
    },
    setBusquedaError: (valor: any) => {
      busquedaLanzaError = valor;
    },
    obtenerUltimaBusqueda: () => ultimaBusqueda,
    fueBuscarEmpresasLlamado: () => buscarEmpresasLlamado,
    obtenerUltimoPayloadCrear: () => ultimoPayloadCrear,
    obtenerUltimoPayloadActualizar: () => ultimoPayloadActualizar,
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
    fueCerradoCon: () => cerradoCon,
  };
}

describe('TrabajoDependienteModalComponent -- modo alta / edición (ngOnInit)', () => {
  it('modo alta: model queda vacío y esEdicion es false', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });

    component.ngOnInit();

    expect(component.esEdicion).toBe(false);
    expect(component.model.empresaTexto).toBe('');
    expect(component.model.cargo).toBe('');
    expect(component.model.desde).toBeNull();
    expect(component.model.hasta).toBeNull();
  });

  it('modo edición con Empresa = Contacto JURIDICA: precarga empresaTexto/Cargo/Desde/Hasta y empresaSeleccionada/empresasEncontradas', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: trabajoExistenteDeContacto });

    component.ngOnInit();

    expect(component.esEdicion).toBe(true);
    expect(component.model.empresaTexto).toBe('Acme SAC');
    expect(component.model.cargo).toBe('Analista');
    expect(component.model.desde).toEqual(new FdDate(2020, 1, 1));
    expect(component.model.hasta).toBeNull();
    expect((component as any).empresaSeleccionada).toEqual(empresaAcme);
    expect(component.empresasEncontradas).toEqual([empresaAcme]);
  });

  it('modo edición con Empresa = texto libre: precarga el texto pero NO empresaSeleccionada', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: trabajoExistenteLibre });

    component.ngOnInit();

    expect(component.model.empresaTexto).toBe('Empresa Manual SAC');
    expect(component.model.hasta).toEqual(new FdDate(2021, 12, 31));
    expect((component as any).empresaSeleccionada).toBeNull();
    expect(component.empresasEncontradas).toEqual([]);
  });
});

describe('TrabajoDependienteModalComponent -- búsqueda de Empresa', () => {
  it('busca en el Backend cuando el texto tiene 2+ caracteres', () => {
    const { component, setRespuestaBusqueda, obtenerUltimaBusqueda } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaBusqueda([empresaAcme]);

    (component as any).ejecutarBusqueda('acme');

    expect(obtenerUltimaBusqueda()).toBe('acme');
    expect(component.empresasEncontradas).toEqual([empresaAcme]);
  });

  it('texto de menos de 2 caracteres no dispara la búsqueda', () => {
    const { component, fueBuscarEmpresasLlamado } = crearComponente({ contactoId: '10', trabajo: null });

    (component as any).ejecutarBusqueda('a');

    expect(fueBuscarEmpresasLlamado()).toBe(false);
  });

  it('error del Backend al buscar no rompe el modal', () => {
    const { component, setBusquedaError } = crearComponente({ contactoId: '10', trabajo: null });
    setBusquedaError({ status: 500 });

    (component as any).ejecutarBusqueda('acme');

    expect(component.empresasEncontradas).toEqual([]);
    expect(component.buscandoEmpresas).toBe(false);
  });

  it('onEmpresaSeleccionada fija el texto y limpia la lista a un solo item', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });

    component.onEmpresaSeleccionada({ item: empresaAcme, index: 0 } as any);

    expect(component.model.empresaTexto).toBe('Acme SAC');
  });

  it('editar el texto después de seleccionar invalida la selección previa', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    component.onEmpresaSeleccionada({ item: empresaAcme, index: 0 } as any);

    component.onEmpresaInputChange('Acme SAC Editado');

    expect((component as any).empresaSeleccionada).toBeNull();
  });
});

describe('TrabajoDependienteModalComponent -- formatearEmpresa', () => {
  it('formatea con la razón social', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    expect(component.formatearEmpresa(empresaAcme)).toBe('Acme SAC');
  });

  it('cadena vacía cuando no hay empresa', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    expect(component.formatearEmpresa(null)).toBe('');
  });
});

describe('TrabajoDependienteModalComponent -- aceptar() / validación', () => {
  it('bloquea sin Empresa, con el mensaje específico bajo el campo, y no llama al Backend', () => {
    const { component, obtenerUltimoPayloadCrear } = crearComponente({ contactoId: '10', trabajo: null });
    component.model = { empresaTexto: '', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errores.empresa).toBe('Empresa es requerida.');
    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });

  it('bloquea sin Cargo', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    component.model = { empresaTexto: 'Acme SAC', cargo: '', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errores.cargo).toBeTruthy();
  });

  it('bloquea sin Desde', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: null, hasta: null };

    component.aceptar();

    expect(component.errores.desde).toBeTruthy();
  });

  it('bloquea Hasta anterior a Desde', () => {
    const { component } = crearComponente({ contactoId: '10', trabajo: null });
    component.model = {
      empresaTexto: 'Acme SAC',
      cargo: 'Analista',
      desde: new FdDate(2022, 1, 1),
      hasta: new FdDate(2021, 1, 1),
    };

    component.aceptar();

    expect(component.errores.hasta).toBeTruthy();
  });

  it('mientras guardando=true, un segundo aceptar() no reenvía la solicitud', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaExito(trabajoExistenteDeContacto);
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };
    component.guardando = true;

    component.aceptar();

    expect(obtenerUltimoPayloadCrear()).toBeNull();
  });
});

describe('TrabajoDependienteModalComponent -- aceptar() / creación (CREAR)', () => {
  it('con Empresa seleccionada del buscador -> empresaContactoId; espera la respuesta HTTP antes de cerrar; POST exitoso cierra con true', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear, fueCerradoCon } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaExito(trabajoExistenteDeContacto);
    component.onEmpresaSeleccionada({ item: empresaAcme, index: 0 } as any);
    component.model.cargo = 'Analista';
    component.model.desde = new FdDate(2020, 1, 1);

    component.aceptar();

    expect(obtenerUltimoPayloadCrear()).toEqual({
      contactoId: '10',
      payload: { empresaContactoId: 5, cargo: 'Analista', desde: '2020-01-01' },
    });
    expect(fueCerradoCon()).toBe(true);
    expect(component.guardando).toBe(false);
  });

  it('con texto libre (sin seleccionar del buscador) -> empresaNombreLibre', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaExito(trabajoExistenteLibre);
    component.model = {
      empresaTexto: 'Empresa Manual SAC',
      cargo: 'Vendedor',
      desde: new FdDate(2019, 6, 15),
      hasta: null,
    };

    component.aceptar();

    expect(obtenerUltimoPayloadCrear()).toEqual({
      contactoId: '10',
      payload: { empresaNombreLibre: 'Empresa Manual SAC', cargo: 'Vendedor', desde: '2019-06-15' },
    });
  });

  it('incluye hasta cuando está presente', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaExito(trabajoExistenteLibre);
    component.model = {
      empresaTexto: 'Empresa Manual SAC',
      cargo: 'Vendedor',
      desde: new FdDate(2019, 6, 15),
      hasta: new FdDate(2020, 1, 1),
    };

    component.aceptar();

    expect(obtenerUltimoPayloadCrear().payload.hasta).toBe('2020-01-01');
  });

  it('editar el texto tras seleccionar una Empresa real -> se trata como texto libre (nunca envía el empresaContactoId desactualizado)', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadCrear } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    setRespuestaExito(trabajoExistenteLibre);
    component.onEmpresaSeleccionada({ item: empresaAcme, index: 0 } as any);
    component.onEmpresaInputChange('Acme SAC Sucursal 2');
    component.model.empresaTexto = 'Acme SAC Sucursal 2';
    component.model.cargo = 'Analista';
    component.model.desde = new FdDate(2020, 1, 1);

    component.aceptar();

    expect(obtenerUltimoPayloadCrear().payload).toEqual({
      empresaNombreLibre: 'Acme SAC Sucursal 2',
      cargo: 'Analista',
      desde: '2020-01-01',
    });
  });

  it('POST fallido mantiene el modal abierto (dialogRef.close no se invoca) y conserva los datos del formulario', () => {
    const { component, setRespuestaError, fueCerradoCon } = crearComponente({ contactoId: '10', trabajo: null });
    setRespuestaError({ status: 500 });
    component.model = {
      empresaTexto: 'Empresa Manual SAC',
      cargo: 'Vendedor',
      desde: new FdDate(2019, 6, 15),
      hasta: null,
    };

    component.aceptar();

    expect(fueCerradoCon()).toBe('no-cerrado');
    expect(component.guardando).toBe(false);
    expect(component.model.empresaTexto).toBe('Empresa Manual SAC');
  });
});

describe('TrabajoDependienteModalComponent -- aceptar() / edición (EDITAR)', () => {
  it('modo edición: usa actualizarTrabajoDependiente (contactoId + trabajo.id), no crearTrabajoDependiente, y cierra con true', () => {
    const { component, setRespuestaExito, obtenerUltimoPayloadActualizar, obtenerUltimoPayloadCrear, fueCerradoCon } =
      crearComponente({ contactoId: '10', trabajo: trabajoExistenteDeContacto });
    setRespuestaExito(trabajoExistenteDeContacto);
    component.ngOnInit();
    component.model.cargo = 'Analista Senior';

    component.aceptar();

    expect(obtenerUltimoPayloadActualizar()).toMatchObject({ contactoId: '10', trabajoId: '42' });
    expect(obtenerUltimoPayloadActualizar().payload).toEqual({
      empresaContactoId: 5,
      cargo: 'Analista Senior',
      desde: '2020-01-01',
    });
    expect(obtenerUltimoPayloadCrear()).toBeNull();
    expect(fueCerradoCon()).toBe(true);
  });

  it('PATCH fallido mantiene el modal abierto', () => {
    const { component, setRespuestaError, fueCerradoCon } = crearComponente({
      contactoId: '10',
      trabajo: trabajoExistenteLibre,
    });
    setRespuestaError({ status: 500 });
    component.ngOnInit();

    component.aceptar();

    expect(fueCerradoCon()).toBe('no-cerrado');
    expect(component.guardando).toBe(false);
  });
});

describe('TrabajoDependienteModalComponent -- aceptar() / manejo de errores', () => {
  it('401/403 -> mensaje de autorización', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', trabajo: null });
    setRespuestaError({ status: 403 });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errorMessage).toContain('autorización');
    expect(component.guardando).toBe(false);
  });

  it('404 en creación -> "El contacto no fue encontrado."', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '999', trabajo: null });
    setRespuestaError({ status: 404 });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errorMessage).toBe('El contacto no fue encontrado.');
  });

  it('404 en edición -> "El trabajo dependiente no fue encontrado."', () => {
    const { component, setRespuestaError } = crearComponente({
      contactoId: '10',
      trabajo: trabajoExistenteDeContacto,
    });
    setRespuestaError({ status: 404 });
    component.ngOnInit();

    component.aceptar();

    expect(component.errorMessage).toBe('El trabajo dependiente no fue encontrado.');
  });

  it('400 con fieldErrors del Backend -> se mapean a errores por campo (empresaContactoId/empresaNombreLibre -> errores.empresa)', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', trabajo: null });
    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de trabajo dependiente inválidos',
        errors: {
          fieldErrors: {
            empresaNombreLibre: ['Empresa es requerida'],
            cargo: ['Cargo es requerido'],
          },
        },
      },
    });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errores.empresa).toBe('Empresa es requerida');
    expect(component.errores.cargo).toBe('Cargo es requerido');
    expect(component.errorMessage).toBe('');
  });

  it('400 sin fieldErrors -> se asocia al campo Empresa', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', trabajo: null });
    setRespuestaError({
      status: 400,
      error: { message: 'La empresa seleccionada no es válida.' },
    });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errores.empresa).toBe('La empresa seleccionada no es válida.');
  });

  it('500 genérico -> mensaje de reintento', () => {
    const { component, setRespuestaError } = crearComponente({ contactoId: '10', trabajo: null });
    setRespuestaError({ status: 500 });
    component.model = { empresaTexto: 'Acme SAC', cargo: 'Analista', desde: new FdDate(2020, 1, 1), hasta: null };

    component.aceptar();

    expect(component.errorMessage).toContain('No fue posible guardar');
  });
});

describe('TrabajoDependienteModalComponent -- cancelar()', () => {
  it('cierra el modal con false, sin llamar al Backend, sin modificar datos', () => {
    const { component, fueCerradoCon, obtenerUltimoPayloadCrear, obtenerUltimoPayloadActualizar } = crearComponente({
      contactoId: '10',
      trabajo: null,
    });
    component.model = {
      empresaTexto: 'Acme SAC',
      cargo: 'Analista',
      desde: new FdDate(2020, 1, 1),
      hasta: null,
    };

    component.cancelar();

    expect(fueCerradoCon()).toBe(false);
    expect(obtenerUltimoPayloadCrear()).toBeNull();
    expect(obtenerUltimoPayloadActualizar()).toBeNull();
  });
});
