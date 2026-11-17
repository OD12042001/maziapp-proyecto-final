/**
 * Fase Representantes (Edición) -- cobertura de
 * `ContactoRepresentantesComponent`.
 *
 * REESCRITO en esta fase (mismo criterio que
 * contacto-direcciones.component.spec.ts, componente ahora basado en
 * `DialogService.open` en vez de un formulario inline): se instancia
 * el componente con `new` (sin TestBed) y se usan stubs manuales
 * (closures) para `ContactosService`/`DialogService`, sin ningún
 * framework de spies.
 */
import { of, throwError, Subject } from 'rxjs';

import { ContactoRepresentantesComponent } from './contacto-representantes.component';
import { ContactosService } from '../../../core/services/contactos.service';
import { Representante } from '../interfaces/representante.interface';

function crearRepresentante(overrides: Partial<Representante> = {}): Representante {
  return {
    contactoRepresentanteId: '900',
    representanteId: '5',
    tipoDocumento: 'DNI',
    numeroDocumento: '12345678',
    nombres: 'Juan',
    apellidos: 'Pérez',
    cargo: 'Gerente General',
    celular: null,
    correo: null,
    ...overrides,
  };
}

function crearComponente() {
  let respuestaListar: Representante[] = [];
  let erroreslistar: any = null;

  let ultimaDesactivacion: [string, string] | null = null;
  let respuestaDesactivarError: any = null;
  let modoDesactivarExito = true;

  const contactosServiceStub = {
    obtenerRepresentantes: (contactoId: string) => {
      return erroreslistar ? throwError(() => erroreslistar) : of(respuestaListar);
    },

    desactivarRepresentante: (contactoId: string, representanteId: string) => {
      ultimaDesactivacion = [contactoId, representanteId];
      return modoDesactivarExito ? of(undefined) : throwError(() => respuestaDesactivarError);
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
    markForCheck: () => {},
  } as any;

  const component = new ContactoRepresentantesComponent(
    contactosServiceStub,
    dialogServiceStub,
    cdrStub,
  );

  return {
    component,
    setRespuestaListar: (valor: Representante[]) => {
      erroreslistar = null;
      respuestaListar = valor;
    },
    setErrorListar: (valor: any) => {
      erroreslistar = valor;
    },
    setRespuestaDesactivarExito: () => {
      modoDesactivarExito = true;
    },
    setRespuestaDesactivarError: (valor: any) => {
      modoDesactivarExito = false;
      respuestaDesactivarError = valor;
    },
    obtenerUltimaDesactivacion: () => ultimaDesactivacion,
    obtenerUltimaAperturaData: () => ultimaAperturaData,
    emitirCierreModal: (resultado: unknown) => afterClosedSubject.next(resultado),
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
  };
}

describe('ContactoRepresentantesComponent -- carga inicial (ngOnChanges)', () => {
  it('al recibir contactoId, carga la lista de representantes de esa empresa', () => {
    const { component, setRespuestaListar } = crearComponente();
    setRespuestaListar([crearRepresentante()]);

    component.contactoId = '10';
    component.ngOnChanges({ contactoId: {} as any });

    expect(component.representantes.length).toBe(1);
    expect(component.loading).toBe(false);
  });

  it('sin contactoId, no intenta cargar', () => {
    const { component } = crearComponente();

    component.contactoId = '';
    component.ngOnChanges({ contactoId: {} as any });

    expect(component.representantes).toEqual([]);
  });

  it('error al cargar: loading vuelve a false y no lanza excepción', () => {
    const { component, setErrorListar } = crearComponente();
    setErrorListar({ status: 500 });

    component.contactoId = '10';
    component.ngOnChanges({ contactoId: {} as any });

    expect(component.loading).toBe(false);
  });
});

describe('ContactoRepresentantesComponent -- abrir modal (crear/editar)', () => {
  it('agregarRepresentante abre el modal en modo alta (representante: null)', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    component.contactoId = '10';

    component.agregarRepresentante();

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', representante: null });
  });

  it('editarRepresentante abre el modal en modo edición, con el representante seleccionado', () => {
    const { component, obtenerUltimaAperturaData } = crearComponente();
    component.contactoId = '10';
    const representante = crearRepresentante();

    component.editarRepresentante(representante);

    expect(obtenerUltimaAperturaData()).toEqual({ contactoId: '10', representante });
  });

  it('al cerrar el modal con true, recarga la lista de representantes', () => {
    const { component, setRespuestaListar, emitirCierreModal } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([crearRepresentante()]);

    component.agregarRepresentante();
    component.representantes = []; // fuerza un estado distinguible antes de recargar
    emitirCierreModal(true);

    expect(component.representantes).toEqual([crearRepresentante()]);
  });

  it('al cerrar el modal con false (Cancelar), NO recarga la lista', () => {
    const { component, setRespuestaListar, emitirCierreModal } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([crearRepresentante()]);

    component.agregarRepresentante();
    component.representantes = [];
    emitirCierreModal(false);

    expect(component.representantes).toEqual([]);
  });
});

describe('ContactoRepresentantesComponent -- desactivarRepresentante (con confirmación)', () => {
  const originalConfirm = window.confirm;

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('pide confirmación antes de desactivar; si el usuario cancela, no llama al Backend', () => {
    window.confirm = () => false;
    const { component, obtenerUltimaDesactivacion } = crearComponente();
    component.contactoId = '10';

    component.desactivarRepresentante(crearRepresentante({ representanteId: '5' }));

    expect(obtenerUltimaDesactivacion()).toBeNull();
  });

  it('si el usuario confirma, desactiva la relación con el representante y recarga la lista', () => {
    window.confirm = () => true;
    const { component, setRespuestaListar, obtenerUltimaDesactivacion } = crearComponente();
    component.contactoId = '10';
    setRespuestaListar([]);

    component.desactivarRepresentante(crearRepresentante({ representanteId: '5' }));

    expect(obtenerUltimaDesactivacion()).toEqual(['10', '5']);
    expect(component.representantes).toEqual([]);
  });

  it('en error, muestra un mensaje sin lanzar excepción', () => {
    window.confirm = () => true;
    const { component, setRespuestaDesactivarError } = crearComponente();
    component.contactoId = '10';
    setRespuestaDesactivarError({ status: 500 });

    component.desactivarRepresentante(crearRepresentante());

    expect(component.errorMessage).toBeTruthy();
  });

  it('401/403 al desactivar -> mensaje de autorización', () => {
    window.confirm = () => true;
    const { component, setRespuestaDesactivarError } = crearComponente();
    component.contactoId = '10';
    setRespuestaDesactivarError({ status: 403 });

    component.desactivarRepresentante(crearRepresentante());

    expect(component.errorMessage).toContain('autorización');
  });
});
