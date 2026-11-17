/**
 * Fase Direcciones -- cobertura de `ContactoDireccionesComponent`.
 *
 * Mismo criterio que contacto-modal.component.spec.ts /
 * direccion-modal.component.spec.ts: se instancia el componente con
 * `new`, con stubs mínimos y sin spies de ningún framework de testing.
 */
import { of, throwError, Subject } from 'rxjs';

import { ContactoDireccionesComponent } from './contacto-direcciones.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { Direccion } from '../interfaces/direccion.interface';

const direccion1: Direccion = {
  idDireccion: 1,
  idContacto: 10,
  idDistrito: 1501,
  distrito: 'MIRAFLORES',
  provincia: 'LIMA',
  departamento: 'LIMA',
  calle: 'Av. Javier Prado Este',
  numero: '1234',
  departamentoInterior: null,
  activo: true,
  fechaCreacion: '2026-01-01T00:00:00.000Z',
  fechaModificacion: null,
};

function crearComponente() {
  let respuestaListar: any = [];
  let listarLanzaError: any = null;

  let ultimoDesactivar: any = null;
  let respuestaDesactivarError: any = null;
  let desactivarLanzaError = false;

  const contactosServiceStub = {
    obtenerDirecciones: (contactoId: string) => {
      return listarLanzaError ? throwError(() => listarLanzaError) : of(respuestaListar);
    },

    desactivarDireccion: (contactoId: string, idDireccion: number) => {
      ultimoDesactivar = { contactoId, idDireccion };
      return desactivarLanzaError ? throwError(() => respuestaDesactivarError) : of(undefined);
    },
  } as unknown as ContactosService;

  let ultimaAperturaData: any = null;
  const afterClosedSubject = new Subject<unknown>();

  const dialogServiceStub = {
    open: (_component: unknown, config: any) => {
      ultimaAperturaData = config?.data;
      return { afterClosed: afterClosedSubject.asObservable() } as any;
    },
  } as any;

  let llamadasDetectChanges = 0;
  const cdrStub = {
    detectChanges: () => {
      llamadasDetectChanges++;
    },
    // El componente llama markForCheck() dentro de un queueMicrotask
    // (ver contacto-direcciones.component.ts::cargarDirecciones). Ese
    // microtask corre después de que el test termina; sin este stub,
    // Vitest reporta "this.cdr.markForCheck is not a function" como
    // excepción no capturada y la suite sale con código 1 aunque todos
    // los casos pasen. No cambia ninguna aserción.
    markForCheck: () => {},
  } as any;

  const component = new ContactoDireccionesComponent(
    contactosServiceStub,
    dialogServiceStub,
    cdrStub,
  );

  return {
    component,
    setRespuestaListar: (valor: any) => {
      respuestaListar = valor;
    },
    setListarError: (valor: any) => {
      listarLanzaError = valor;
    },
    setDesactivarError: (valor: any) => {
      desactivarLanzaError = true;
      respuestaDesactivarError = valor;
    },
    obtenerUltimoDesactivar: () => ultimoDesactivar,
    obtenerUltimaAperturaData: () => ultimaAperturaData,
    emitirCierreModal: (resultado: unknown) => afterClosedSubject.next(resultado),
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
  };
}

describe('ContactoDireccionesComponent -- carga inicial (ngOnChanges)', () => {
  it('carga las direcciones cuando contactoId cambia a un valor no vacío', () => {
    const { component, setRespuestaListar } = crearComponente();
    setRespuestaListar([direccion1]);

    component.contactoId = '10';
    component.ngOnChanges({ contactoId: { currentValue: '10' } } as any);

    expect(component.direcciones).toEqual([direccion1]);
    expect(component.loading).toBe(false);
  });

  it('error al cargar -> loading vuelve a false sin lanzar excepción', () => {
    const { component, setListarError } = crearComponente();
    setListarError({ status: 500 });

    component.contactoId = '10';
    component.ngOnChanges({ contactoId: { currentValue: '10' } } as any);

    expect(component.loading).toBe(false);
  });
});

describe('ContactoDireccionesComponent -- abrir modal (crear/editar)', () => {
  it('agregarDireccion abre el modal en modo alta (direccion: null)', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    component.contactoId = '10';

    component.agregarDireccion();

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', direccion: null });
  });

  it('editarDireccion abre el modal en modo edición, con la dirección seleccionada', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    component.contactoId = '10';

    component.editarDireccion(direccion1);

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', direccion: direccion1 });
  });

  it('al cerrar el modal con true, recarga la lista de direcciones', () => {
    const { component, setRespuestaListar, emitirCierreModal } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([direccion1]);

    component.agregarDireccion();
    component.direcciones = []; // fuerza un estado distinguible antes de recargar
    emitirCierreModal(true);

    expect(component.direcciones).toEqual([direccion1]);
  });

  it('al cerrar el modal con false (Cancelar), NO recarga la lista', () => {
    const { component, setRespuestaListar, emitirCierreModal } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([direccion1]);

    component.agregarDireccion();
    component.direcciones = [];
    emitirCierreModal(false);

    expect(component.direcciones).toEqual([]);
  });
});

describe('ContactoDireccionesComponent -- desactivarDireccion (con confirmación)', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('pide confirmación antes de desactivar; si el usuario cancela, no llama al Backend', () => {
    window.confirm = () => false;
    const { component, obtenerUltimoDesactivar } = crearComponente();
    component.contactoId = '10';

    component.desactivarDireccion(direccion1);

    expect(obtenerUltimoDesactivar()).toBeNull();
  });

  it('si el usuario confirma, desactiva la dirección y recarga la lista', () => {
    window.confirm = () => true;
    const { component, setRespuestaListar, obtenerUltimoDesactivar } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([]);

    component.desactivarDireccion(direccion1);

    expect(obtenerUltimoDesactivar()).toEqual({ contactoId: '10', idDireccion: 1 });
    expect(component.direcciones).toEqual([]);
  });

  it('error al desactivar -> mensaje de reintento, no rompe el componente', () => {
    window.confirm = () => true;
    const { component, setDesactivarError } = crearComponente();
    component.contactoId = '10';
    setDesactivarError({ status: 500 });

    component.desactivarDireccion(direccion1);

    expect(component.errorMessage).toContain('No fue posible desactivar');
  });

  it('401/403 al desactivar -> mensaje de autorización', () => {
    window.confirm = () => true;
    const { component, setDesactivarError } = crearComponente();
    component.contactoId = '10';
    setDesactivarError({ status: 403 });

    component.desactivarDireccion(direccion1);

    expect(component.errorMessage).toContain('autorización');
  });
});
