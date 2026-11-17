/**
 * Fase 3.17/3.18 — cobertura de `guardar()`:
 *
 * - Fase 3.17: que `errorMessage` use el detalle por campo que ya
 *   devuelve el Backend en vez de quedarse con el genérico "Datos de
 *   contacto inválidos".
 * - Fase 3.18: que cada error se asocie a `errores.<campo>` (para
 *   mostrarse debajo del input correspondiente, en vez de solo en un
 *   mensaje general); que `loading` vuelva a `false` de inmediato en
 *   400/401/403/exito; y que la vista se refresque sin esperar a que
 *   el usuario haga clic fuera del modal (`cdr.detectChanges()`).
 *
 * Se instancia el componente con `new` (mismo criterio ya usado en
 * `contacto-ficha.component.spec.ts`): evita depender de TestBed/
 * compilación de plantilla para un cambio que es puramente lógica
 * TypeScript. Los stubs de `DialogRef`/`Router`/`ContactosService`/
 * `ChangeDetectorRef` son mínimos, solo lo que `guardar()`/`cerrar()`
 * realmente usan.
 */
import { of, throwError } from 'rxjs';

import { ContactoModalComponent } from './contacto-modal.component';
import { ContactosService } from '../../../core/services/contactos.service';

function crearComponente() {
  let cerrado = false;
  const dialogRefStub = {
    close: () => {
      cerrado = true;
    },
  } as any;

  const navegaciones: unknown[][] = [];
  const routerStub = {
    navigate: (ruta: unknown[]) => {
      navegaciones.push(ruta);
      return Promise.resolve(true);
    },
  } as any;

  let ultimoPayload: any = null;
  let respuestaError: any = null;
  let respuestaExito: any = null;
  let modoExito = false;

  const contactosServiceStub = {
    crearContacto: (payload: any) => {
      ultimoPayload = payload;
      return modoExito ? of(respuestaExito) : throwError(() => respuestaError);
    },

    // 🐛 Fix: contacto-modal.component.ts::guardar() llama a
    // triggerRefresh() en el camino de éxito (antes de cerrar() -- ver
    // comentario ahí) para que la lista de Contactos se refresque. El
    // stub no lo definía, lo que rompía el test '8: éxito (201)' con
    // 'triggerRefresh is not a function' en cuanto guardar() tenía
    // éxito -- no relacionado con Direcciones, gap preexistente del
    // stub.
    triggerRefresh: () => {},
  } as unknown as ContactosService;

  let llamadasDetectChanges = 0;
  const cdrStub = {
    detectChanges: () => {
      llamadasDetectChanges++;
    },
    markForCheck: () => {},
  } as any;

  const component = new ContactoModalComponent(dialogRefStub, contactosServiceStub, routerStub, cdrStub);

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
    obtenerUltimoPayload: () => ultimoPayload,
    obtenerLlamadasDetectChanges: () => llamadasDetectChanges,
    fueCerrado: () => cerrado,
    obtenerNavegaciones: () => navegaciones,
  };
}

describe('ContactoModalComponent — guardar() / mensajes de error y por campo (Fase 3.17/3.18)', () => {
  // 1. RUC inválido -> error asociado a numeroDocumento
  it('1: 400 con RUC inválido -> errores.numeroDocumento tiene el mensaje específico, sin repetirlo en errorMessage', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de contacto inválidos',
        errors: {
          fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
        },
      },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789', // 9 dígitos: pasa el mínimo del validar() local, el Backend simulado es quien rechaza
      nombres: '',
      apellidos: '',
      razonSocial: 'Empresa SAC',
      celular: '',
    };

    component.guardar();

    expect(component.errores.numeroDocumento).toBe('el RUC debe tener exactamente 11 dígitos.');
    expect(component.errores.razonSocial).toBeUndefined();
    // Fase 3.18: el mismo error no debe repetirse en el mensaje general.
    expect(component.errorMessage).toBe('');
  });

  // 2. razonSocial inválida -> error asociado a razonSocial
  it('2: 400 con razonSocial ausente -> errores.razonSocial tiene el mensaje específico, sin errorMessage general', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de contacto inválidos',
        errors: {
          fieldErrors: { razonSocial: ['RazonSocial es requerido para persona jurídica'] },
        },
      },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '12345678901',
      nombres: '',
      apellidos: '',
      razonSocial: 'temporal', // no vacío: para no ser bloqueado por validar() local y llegar al Backend simulado
      celular: '',
    };

    component.guardar();

    expect(component.errores.razonSocial).toBe('este campo es obligatorio.');
    expect(component.errorMessage).toBe('');
  });

  // 3. Múltiples errores -> cada error asociado a su campo
  it('3: 400 con varios campos inválidos (JURIDICA) -> cada error queda en su propio campo, sin bloque general', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de contacto inválidos',
        errors: {
          fieldErrors: {
            numeroDocumento: ['Formato de RUC inválido'],
            razonSocial: ['RazonSocial es requerido para persona jurídica'],
          },
        },
      },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789',
      nombres: '',
      apellidos: '',
      razonSocial: 'temporal',
      celular: '',
    };

    component.guardar();

    expect(component.errores).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
      razonSocial: 'este campo es obligatorio.',
    });
    expect(component.errorMessage).toBe('');
  });

  it('NATURAL: 400 con nombres y apellidos ausentes -> cada error queda en su propio campo', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: {
        message: 'Datos de contacto inválidos',
        errors: {
          fieldErrors: {
            nombres: ['Nombres es requerido para persona natural'],
            apellidos: ['Apellidos es requerido para persona natural'],
          },
        },
      },
    });

    component.model = {
      tipoContacto: 'NATURAL',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombres: 'temporal',
      apellidos: 'temporal',
      razonSocial: '',
      celular: '',
    };

    component.guardar();

    expect(component.errores).toEqual({
      nombres: 'este campo es obligatorio.',
      apellidos: 'este campo es obligatorio.',
    });
    expect(component.errorMessage).toBe('');
  });

  // 4. El estado de carga termina cuando el Backend devuelve 400
  it('4: 400 -> loading vuelve a false inmediatamente', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: { errors: { fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] } } },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789',
      nombres: '',
      apellidos: '',
      razonSocial: 'Empresa SAC',
      celular: '',
    };

    component.guardar();

    expect(component.loading).toBe(false);
  });

  // 5. El error se actualiza inmediatamente después de la respuesta HTTP (sin esperar clic fuera del modal)
  it('5: 400 -> se llama a cdr.detectChanges() para refrescar la vista sin esperar interacción del usuario', () => {
    const { component, setRespuestaError, obtenerLlamadasDetectChanges } = crearComponente();

    setRespuestaError({
      status: 400,
      error: { errors: { fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] } } },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789',
      nombres: '',
      apellidos: '',
      razonSocial: 'Empresa SAC',
      celular: '',
    };

    expect(obtenerLlamadasDetectChanges()).toBe(0);

    component.guardar();

    expect(obtenerLlamadasDetectChanges()).toBe(1);
  });

  // 6. 409 conserva su comportamiento actual
  it('6: 409 de documento duplicado -> conserva el mensaje del Backend en errorMessage, sin errores por campo', () => {
    const { component, setRespuestaError, obtenerLlamadasDetectChanges } = crearComponente();

    setRespuestaError({
      status: 409,
      error: {
        message: 'Ya existe un contacto registrado con ese tipo y número de documento.',
      },
    });

    component.model = {
      tipoContacto: 'NATURAL',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombres: 'Juan',
      apellidos: 'Perez',
      razonSocial: '',
      celular: '',
    };

    component.guardar();

    expect(component.errorMessage).toBe(
      'Ya existe un contacto registrado con ese tipo y número de documento.',
    );
    expect(component.errores).toEqual({});
    expect(component.loading).toBe(false);
    expect(obtenerLlamadasDetectChanges()).toBe(1);
  });

  // 7. 403 conserva su comportamiento actual
  it('7: 403 -> conserva el mensaje de autorización existente, sin pasar por el mapeo de campos', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({ status: 403, error: { error: 'Forbidden' } });

    component.model = {
      tipoContacto: 'NATURAL',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombres: 'Juan',
      apellidos: 'Perez',
      razonSocial: '',
      celular: '',
    };

    component.guardar();

    expect(component.errorMessage).toBe(
      'No tienes autorización para realizar esta acción. Contacta a un administrador si consideras que se trata de un error.',
    );
    expect(component.errores).toEqual({});
  });

  // 8. Éxito 201 conserva su comportamiento actual
  it('8: éxito (201) -> loading vuelve a false, se refresca la vista, se cierra el modal y navega a la ficha', () => {
    const { component, setRespuestaExito, obtenerLlamadasDetectChanges, fueCerrado, obtenerNavegaciones } =
      crearComponente();

    setRespuestaExito({ id: 'abc-123', tipoContacto: 'NATURAL' } as any);

    component.model = {
      tipoContacto: 'NATURAL',
      tipoDocumento: 'DNI',
      numeroDocumento: '12345678',
      nombres: 'Juan',
      apellidos: 'Perez',
      razonSocial: '',
      celular: '',
    };

    component.guardar();

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('');
    expect(component.errores).toEqual({});
    expect(obtenerLlamadasDetectChanges()).toBe(1);
    expect(fueCerrado()).toBe(true);
    expect(obtenerNavegaciones()).toEqual([['/contactos', 'abc-123']]);
  });

  it('al corregir los datos y volver a guardar, los errores anteriores se reemplazan (no se acumulan)', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: {
        errors: {
          fieldErrors: {
            numeroDocumento: ['Formato de RUC inválido'],
            razonSocial: ['RazonSocial es requerido para persona jurídica'],
          },
        },
      },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789',
      nombres: '',
      apellidos: '',
      razonSocial: 'temporal',
      celular: '',
    };

    component.guardar();

    expect(component.errores).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
      razonSocial: 'este campo es obligatorio.',
    });

    // El usuario corrige razonSocial; el Backend ahora solo rechaza numeroDocumento.
    setRespuestaError({
      status: 400,
      error: { errors: { fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] } } },
    });

    component.guardar();

    expect(component.errores).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
    });
  });

  it('cambiar tipoContacto (onTipoContactoChange) limpia los errores de campo anteriores', () => {
    const { component, setRespuestaError } = crearComponente();

    setRespuestaError({
      status: 400,
      error: { errors: { fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] } } },
    });

    component.model = {
      tipoContacto: 'JURIDICA',
      tipoDocumento: 'RUC',
      numeroDocumento: '123456789',
      nombres: '',
      apellidos: '',
      razonSocial: 'Empresa SAC',
      celular: '',
    };

    component.guardar();
    expect(component.errores.numeroDocumento).toBeDefined();

    component.model.tipoContacto = 'NATURAL';
    component.onTipoContactoChange();

    expect(component.errores).toEqual({});
    expect(component.errorMessage).toBe('');
  });
});
