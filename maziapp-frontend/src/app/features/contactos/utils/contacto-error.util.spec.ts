/**
 * Fase 3.17 — cobertura del mapeo de errores de validación de
 * Contactos a mensajes legibles por campo.
 *
 * Los cuerpos de error usados en estos tests son exactamente los que
 * hoy produce `contacto.validator.ts` (Backend, sin modificar) a
 * través de `parsed.error.flatten()` en `createContacto.ts` — no se
 * inventan mensajes de Zod nuevos, se reproducen los reales para
 * verificar que la traducción a texto amigable es correcta.
 */
import { construirMensajeErroresValidacion, construirErroresPorCampo } from './contacto-error.util';

describe('construirMensajeErroresValidacion', () => {
  it('devuelve null cuando el cuerpo no trae errors (ej. 409 duplicado o 500 genérico)', () => {
    expect(
      construirMensajeErroresValidacion({
        message: 'Ya existe un contacto registrado con ese tipo y número de documento.',
      }),
    ).toBeNull();
  });

  it('devuelve null cuando el cuerpo es null/undefined', () => {
    expect(construirMensajeErroresValidacion(null)).toBeNull();
    expect(construirMensajeErroresValidacion(undefined)).toBeNull();
  });

  // A. JURIDICA + RUC de 10 dígitos
  it('A: RUC de 10 dígitos -> mensaje específico de RUC (11 dígitos)', () => {
    const resultado = construirMensajeErroresValidacion({
      message: 'Datos de contacto inválidos',
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
        formErrors: [],
      },
    });

    expect(resultado).toBe('Número de documento: el RUC debe tener exactamente 11 dígitos.');
  });

  // B. JURIDICA + RUC de 12 dígitos (mismo mensaje de Zod que A: el
  // validador no distingue "corto" de "largo" para RUC, solo formato)
  it('B: RUC de 12 dígitos -> mismo mensaje específico de RUC', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
      },
    });

    expect(resultado).toBe('Número de documento: el RUC debe tener exactamente 11 dígitos.');
  });

  // C. JURIDICA + RUC con letras (mismo mensaje de Zod)
  it('C: RUC con letras -> mensaje específico de RUC', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
      },
    });

    expect(resultado).toBe('Número de documento: el RUC debe tener exactamente 11 dígitos.');
  });

  // D. JURIDICA sin razón social
  it('D: razonSocial ausente -> mensaje específico de razón social obligatoria', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { razonSocial: ['RazonSocial es requerido para persona jurídica'] },
      },
    });

    expect(resultado).toBe('Razón social: este campo es obligatorio.');
  });

  // E. JURIDICA con varios campos inválidos simultáneamente
  it('E: varios campos inválidos -> muestra todos los errores, con encabezado y viñetas', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: {
          numeroDocumento: ['Formato de RUC inválido'],
          razonSocial: ['RazonSocial es requerido para persona jurídica'],
        },
      },
    });

    expect(resultado).toBe(
      'Corrige los siguientes campos:\n' +
        '• Número de documento: el RUC debe tener exactamente 11 dígitos.\n' +
        '• Razón social: este campo es obligatorio.',
    );
  });

  // F. NATURAL con documento inválido (DNI)
  it('F: DNI con formato inválido -> mensaje específico de DNI (8 dígitos)', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de DNI inválido'] },
      },
    });

    expect(resultado).toBe('Número de documento: el DNI debe tener exactamente 8 dígitos.');
  });

  // G. NATURAL sin nombres/apellidos
  it('G: nombres y apellidos ausentes -> muestra ambos errores específicos', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: {
          nombres: ['Nombres es requerido para persona natural'],
          apellidos: ['Apellidos es requerido para persona natural'],
        },
      },
    });

    expect(resultado).toBe(
      'Corrige los siguientes campos:\n' +
        '• Nombres: este campo es obligatorio.\n' +
        '• Apellidos: este campo es obligatorio.',
    );
  });

  it('celular inválido -> mensaje específico de celular', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { celular: ['Celular inválido'] },
      },
    });

    expect(resultado).toBe('Celular: ingresa un número de celular válido.');
  });

  it('un mensaje de Zod no contemplado en el mapa se muestra tal cual (nunca se oculta el detalle)', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { numeroDocumento: ['Un mensaje nuevo de Zod no mapeado todavía'] },
      },
    });

    expect(resultado).toBe('Número de documento: Un mensaje nuevo de Zod no mapeado todavía');
  });

  it('un campo sin etiqueta conocida usa el nombre técnico tal cual (defensivo, nunca lanza error)', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: { campoDesconocido: ['Algún mensaje'] },
      },
    });

    expect(resultado).toBe('campoDesconocido: Algún mensaje');
  });

  it('formErrors (sin campo asociado) se incluyen también en el mensaje final', () => {
    const resultado = construirMensajeErroresValidacion({
      errors: {
        fieldErrors: {},
        formErrors: ['Propiedad no reconocida: dni'],
      },
    });

    expect(resultado).toBe('Propiedad no reconocida: dni');
  });
});

/**
 * Fase 3.18 — cobertura de `construirErroresPorCampo`: separa cada
 * fieldError hacia su campo (`camposConError`) y deja formErrors /
 * fieldErrors sin campo conocido como `mensajeGeneral`, sin combinar
 * nunca ambos en el mismo lugar. Reutiliza los mismos cuerpos de error
 * reales que `construirMensajeErroresValidacion` (sin inventar
 * mensajes de Zod nuevos).
 */
describe('construirErroresPorCampo', () => {
  it('devuelve camposConError vacío y mensajeGeneral null cuando el cuerpo no trae errors', () => {
    const resultado = construirErroresPorCampo({
      message: 'Ya existe un contacto registrado con ese tipo y número de documento.',
    });

    expect(resultado.camposConError).toEqual({});
    expect(resultado.mensajeGeneral).toBeNull();
  });

  it('devuelve camposConError vacío y mensajeGeneral null cuando el cuerpo es null/undefined', () => {
    expect(construirErroresPorCampo(null)).toEqual({ camposConError: {}, mensajeGeneral: null });
    expect(construirErroresPorCampo(undefined)).toEqual({
      camposConError: {},
      mensajeGeneral: null,
    });
  });

  // 1. RUC inválido -> error asociado a numeroDocumento
  it('1: RUC inválido -> el error queda en camposConError.numeroDocumento, sin mensajeGeneral', () => {
    const resultado = construirErroresPorCampo({
      message: 'Datos de contacto inválidos',
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
      },
    });

    expect(resultado.camposConError).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  // 2. razonSocial inválida -> error asociado a razonSocial
  it('2: razonSocial ausente -> el error queda en camposConError.razonSocial', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { razonSocial: ['RazonSocial es requerido para persona jurídica'] },
      },
    });

    expect(resultado.camposConError).toEqual({
      razonSocial: 'este campo es obligatorio.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  // 3. Múltiples errores -> cada error asociado a su campo, sin mensajeGeneral
  it('3: varios campos inválidos (JURIDICA) -> cada uno en su propia clave de camposConError', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: {
          numeroDocumento: ['Formato de RUC inválido'],
          razonSocial: ['RazonSocial es requerido para persona jurídica'],
        },
      },
    });

    expect(resultado.camposConError).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
      razonSocial: 'este campo es obligatorio.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  it('NATURAL: nombres y apellidos ausentes -> cada uno en su propia clave', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: {
          nombres: ['Nombres es requerido para persona natural'],
          apellidos: ['Apellidos es requerido para persona natural'],
        },
      },
    });

    expect(resultado.camposConError).toEqual({
      nombres: 'este campo es obligatorio.',
      apellidos: 'este campo es obligatorio.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  it('NATURAL: DNI inválido -> el error queda en camposConError.numeroDocumento', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de DNI inválido'] },
      },
    });

    expect(resultado.camposConError).toEqual({
      numeroDocumento: 'el DNI debe tener exactamente 8 dígitos.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  it('celular inválido -> el error queda en camposConError.celular', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { celular: ['Celular inválido'] },
      },
    });

    expect(resultado.camposConError).toEqual({
      celular: 'ingresa un número de celular válido.',
    });
    expect(resultado.mensajeGeneral).toBeNull();
  });

  it('solo se toma el primer mensaje de cada campo cuando el Backend reporta varios', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido', 'Otro mensaje adicional'] },
      },
    });

    expect(resultado.camposConError).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
    });
  });

  it('formErrors (sin campo asociado, ej. clave no reconocida por .strict()) va a mensajeGeneral, no a camposConError', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: {},
        formErrors: ["Unrecognized key(s) in object: 'dni'"],
      },
    });

    expect(resultado.camposConError).toEqual({});
    expect(resultado.mensajeGeneral).toBe("Unrecognized key(s) in object: 'dni'");
  });

  it('un fieldError para una clave sin campo/input en el formulario no se pierde: pasa a mensajeGeneral', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { campoDesconocido: ['Algún mensaje'] },
      },
    });

    expect(resultado.camposConError).toEqual({});
    expect(resultado.mensajeGeneral).toBe('campoDesconocido: Algún mensaje');
  });

  it('nunca combina el mismo error en camposConError y mensajeGeneral a la vez', () => {
    const resultado = construirErroresPorCampo({
      errors: {
        fieldErrors: { numeroDocumento: ['Formato de RUC inválido'] },
        formErrors: ["Unrecognized key(s) in object: 'dni'"],
      },
    });

    expect(resultado.camposConError).toEqual({
      numeroDocumento: 'el RUC debe tener exactamente 11 dígitos.',
    });
    expect(resultado.mensajeGeneral).toBe("Unrecognized key(s) in object: 'dni'");
  });
});
