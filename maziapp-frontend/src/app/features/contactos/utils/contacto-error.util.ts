/**
 * Fase 3.17 — Traducción de errores de validación de Contactos
 * (Backend, Zod en `contacto.validator.ts::contactoCreateSchema`, SIN
 * cambios) a mensajes legibles por campo, para el modal "Crear
 * contacto".
 *
 * CAUSA DEL PROBLEMA QUE CORRIGE ESTE ARCHIVO (diagnóstico previo a la
 * implementación): el Backend (`createContacto.ts`) ya devuelve, en un
 * 400 de validación, el cuerpo completo:
 *   { message: "Datos de contacto inválidos",
 *     errors: { fieldErrors: Record<string, string[]>, formErrors: string[] } }
 * (`fieldErrors`/`formErrors` provienen de `parsed.error.flatten()`).
 * El detalle por campo SIEMPRE llegó completo hasta el Frontend — se
 * perdía únicamente en `contacto-modal.component.ts::guardar()`, en el
 * manejador `error` del `subscribe()`, que solo leía
 * `err?.error?.message` (el mensaje genérico) e ignoraba por completo
 * `err?.error?.errors`. No fue necesario ni se realizó ningún cambio
 * en el Backend.
 *
 * IMPORTANTE: este archivo NO valida nada — el Backend sigue siendo la
 * única autoridad de las reglas (regex de RUC/DNI/CE/PASAPORTE,
 * obligatoriedad de razonSocial/nombres/apellidos, formato de celular,
 * etc.). Este archivo únicamente:
 *   1. traduce el nombre técnico de cada campo (`numeroDocumento`) a
 *      una etiqueta legible ("Número de documento"), y
 *   2. reformula el texto de cada mensaje de Zod YA EXISTENTE (los
 *      literales de la izquierda de `MENSAJES_CONOCIDOS` son
 *      exactamente los que hoy produce `contacto.validator.ts`, sin
 *      modificarlo) a una redacción más amigable, preservando el
 *      significado exacto de la regla real — nunca se inventa un
 *      texto que la contradiga.
 * Si el Backend alguna vez devolviera un mensaje no contemplado aquí
 * (campo nuevo, o texto de Zod distinto al esperado), se muestra el
 * mensaje original tal cual — nunca se oculta el error.
 */

export const ETIQUETAS_CAMPO_CONTACTO: Record<string, string> = {
  tipoContacto: 'Tipo de contacto',
  tipoDocumento: 'Tipo de documento',
  numeroDocumento: 'Número de documento',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  razonSocial: 'Razón social',
  celular: 'Celular',
};

// campo -> (mensaje EXACTO que hoy produce contacto.validator.ts -> redacción amigable)
const MENSAJES_CONOCIDOS: Record<string, Record<string, string>> = {
  numeroDocumento: {
    'Formato de DNI inválido': 'el DNI debe tener exactamente 8 dígitos.',
    'Formato de RUC inválido': 'el RUC debe tener exactamente 11 dígitos.',
    'Formato de CE inválido':
      'el Carné de Extranjería debe tener entre 6 y 12 caracteres alfanuméricos.',
    'Formato de PASAPORTE inválido':
      'el pasaporte debe tener entre 5 y 15 caracteres alfanuméricos.',
    'Número de documento demasiado corto': 'ingresa un número de documento válido.',
    'Número de documento demasiado largo': 'ingresa un número de documento válido.',
  },
  tipoDocumento: {
    'Persona natural requiere DNI, CE o PASAPORTE':
      'selecciona DNI, CE o PASAPORTE para persona natural.',
    'Persona jurídica requiere RUC': 'selecciona RUC para empresa/persona jurídica.',
  },
  nombres: {
    'Nombres es requerido para persona natural': 'este campo es obligatorio.',
    'Nombres no aplica a persona jurídica': 'no aplica para empresa/persona jurídica.',
  },
  apellidos: {
    'Apellidos es requerido para persona natural': 'este campo es obligatorio.',
    'Apellidos no aplica a persona jurídica': 'no aplica para empresa/persona jurídica.',
  },
  razonSocial: {
    'RazonSocial es requerido para persona jurídica': 'este campo es obligatorio.',
    'RazonSocial no aplica a persona natural': 'no aplica para persona natural.',
  },
  celular: {
    'Celular inválido': 'ingresa un número de celular válido.',
  },
};

function traducirMensajeCampo(campo: string, mensajeOriginal: string): string {
  const traducido = MENSAJES_CONOCIDOS[campo]?.[mensajeOriginal];

  // Si el mensaje no está en el mapa (por ejemplo, un mensaje por
  // defecto de Zod para el que no se definió un `message` custom en el
  // schema, o un texto nuevo no contemplado), se usa el mensaje
  // original de Zod — nunca se oculta el detalle ni se inventa un
  // texto que pueda contradecir la regla real.
  return traducido ?? mensajeOriginal;
}

/**
 * Fase 3.18 — UX: cada error debajo de su propio campo, en vez de un
 * bloque combinado al pie del formulario. `construirMensajeErroresValidacion`
 * (arriba) se mantiene SIN CAMBIOS y sigue exportada — su contrato no
 * se rompe y sus tests actuales no se tocan — pero el modal deja de
 * usarla para el caso de `fieldErrors`: esa función combina
 * fieldErrors + formErrors en un único string, algo estructuralmente
 * incompatible con mostrar un error debajo de cada input (razón
 * técnica para introducir esta función nueva en vez de reutilizar la
 * anterior en ese punto).
 *
 * Reutiliza `ETIQUETAS_CAMPO_CONTACTO`/`MENSAJES_CONOCIDOS`/
 * `traducirMensajeCampo` (arriba) sin duplicar ninguna regla ni
 * mensaje: separa lo que ya devuelve el Backend, no reinterpreta nada.
 *
 * - `camposConError`: un mensaje por campo (el primero que reporta el
 *   Backend para ese campo), para renderizar debajo de su input.
 * - `mensajeGeneral`: solo lo que NO corresponde a un campo del
 *   formulario — `formErrors` (p. ej. `.strict()` de Zod rechazando una
 *   clave no reconocida, que no tiene un campo/input asociado) y,
 *   como red de seguridad, cualquier fieldError para una clave que no
 *   esté en `ETIQUETAS_CAMPO_CONTACTO` (no debería ocurrir hoy, pero
 *   nunca se oculta un error silenciosamente).
 *
 * El mismo error nunca aparece en ambos lugares a la vez.
 */
export interface ErroresCampoContacto {
  tipoContacto?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  nombres?: string;
  apellidos?: string;
  razonSocial?: string;
  celular?: string;
}

export interface ErroresContactoSeparados {
  camposConError: ErroresCampoContacto;
  mensajeGeneral: string | null;
}

export function construirErroresPorCampo(errorBody: unknown): ErroresContactoSeparados {
  const cuerpo = errorBody as
    | { errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
    | null
    | undefined;

  const fieldErrors = cuerpo?.errors?.fieldErrors;
  const formErrors = cuerpo?.errors?.formErrors;

  const camposConError: ErroresCampoContacto = {};
  const mensajesSinCampo: string[] = [];

  if (fieldErrors) {
    for (const campo of Object.keys(fieldErrors)) {
      const mensajes = fieldErrors[campo] ?? [];

      if (mensajes.length === 0) {
        continue;
      }

      // Un único error visible por campo: el primero que reporta el Backend.
      const mensajeTraducido = traducirMensajeCampo(campo, mensajes[0]);

      if (campo in ETIQUETAS_CAMPO_CONTACTO) {
        (camposConError as Record<string, string>)[campo] = mensajeTraducido;
      } else {
        // Campo sin input en este formulario: no se pierde, pasa al mensaje general.
        mensajesSinCampo.push(`${ETIQUETAS_CAMPO_CONTACTO[campo] ?? campo}: ${mensajeTraducido}`);
      }
    }
  }

  if (formErrors) {
    for (const mensaje of formErrors) {
      mensajesSinCampo.push(mensaje);
    }
  }

  let mensajeGeneral: string | null = null;

  if (mensajesSinCampo.length === 1) {
    mensajeGeneral = mensajesSinCampo[0];
  } else if (mensajesSinCampo.length > 1) {
    mensajeGeneral =
      'Corrige los siguientes datos:\n' +
      mensajesSinCampo.map((linea) => `• ${linea}`).join('\n');
  }

  return { camposConError, mensajeGeneral };
}

/**
 * Construye el texto a mostrar en el modal a partir del cuerpo de
 * error que ya devuelve el Backend hoy (ver encabezado del archivo).
 * Devuelve `null` cuando el cuerpo no trae `errors.fieldErrors` ni
 * `errors.formErrors` (por ejemplo, un 409 de documento duplicado o un
 * 500 genérico, que solo traen `message`) — en ese caso, quien llama
 * debe seguir usando su mensaje genérico existente, sin cambios.
 */
export function construirMensajeErroresValidacion(errorBody: unknown): string | null {
  const cuerpo = errorBody as
    | { errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
    | null
    | undefined;

  const fieldErrors = cuerpo?.errors?.fieldErrors;
  const formErrors = cuerpo?.errors?.formErrors;

  if (!fieldErrors && !formErrors) {
    return null;
  }

  const lineas: string[] = [];

  if (fieldErrors) {
    for (const campo of Object.keys(fieldErrors)) {
      const etiqueta = ETIQUETAS_CAMPO_CONTACTO[campo] ?? campo;
      const mensajes = fieldErrors[campo] ?? [];

      for (const mensajeOriginal of mensajes) {
        lineas.push(`${etiqueta}: ${traducirMensajeCampo(campo, mensajeOriginal)}`);
      }
    }
  }

  if (formErrors) {
    for (const mensaje of formErrors) {
      lineas.push(mensaje);
    }
  }

  if (lineas.length === 0) {
    return null;
  }

  if (lineas.length === 1) {
    return lineas[0];
  }

  return 'Corrige los siguientes campos:\n' + lineas.map((linea) => `• ${linea}`).join('\n');
}
