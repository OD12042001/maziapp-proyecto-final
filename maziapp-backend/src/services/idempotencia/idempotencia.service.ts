import { createHash } from "node:crypto";

import * as repository from "../../repositories/idempotencia/idempotencia.repository";

/**
 * Idempotencia de comandos HTTP (ESB lógico).
 *
 * Contrato (`docs/openapi.yaml`, parámetro `Idempotency-Key`):
 *  - primera vez            → se ejecuta la operación y se guarda la respuesta;
 *  - misma clave y MISMO cuerpo → se devuelve la respuesta original, sin
 *    volver a ejecutar (nunca un segundo efecto);
 *  - misma clave y cuerpo DISTINTO → 422;
 *  - misma clave mientras la primera aún corre → 409.
 *
 * La clave se liga también al endpoint y al usuario: reutilizarla en otro
 * endpoint o por otro usuario es un uso incorrecto y responde 422, y
 * jamás expone la respuesta guardada de otro usuario.
 *
 * Solo se guardan respuestas EXITOSAS (< 400). Un rechazo de negocio o un
 * error inesperado libera la clave, de modo que el cliente puede corregir
 * y reintentar con la misma clave.
 */

export class IdempotenciaClaveInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotenciaClaveInvalidaError";
  }
}

export class IdempotenciaCuerpoDistintoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotenciaCuerpoDistintoError";
  }
}

export class IdempotenciaEnProcesoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IdempotenciaEnProcesoError";
  }
}

const PATRON_CLAVE = /^[A-Za-z0-9._:-]{8,100}$/;

/** `Idempotency-Key`: 8–100 caracteres de un juego acotado. */
export function validarClave(clave: string | null | undefined): string {
  const valor = (clave ?? "").trim();

  if (!PATRON_CLAVE.test(valor)) {
    throw new IdempotenciaClaveInvalidaError(
      "Idempotency-Key es obligatoria: de 8 a 100 caracteres (letras, números, . _ : -)",
    );
  }

  return valor;
}

function canonico(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(canonico);
  }

  if (valor && typeof valor === "object") {
    return Object.keys(valor as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonico((valor as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return valor;
}

/**
 * Huella SHA-256 del cuerpo con las claves ordenadas: dos JSON con el
 * mismo contenido y distinto orden de propiedades son la MISMA solicitud.
 */
export function hashDeCuerpo(cuerpo: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonico(cuerpo ?? null)))
    .digest("hex");
}

export interface SolicitudIdempotenteInput {
  clave: string;
  endpoint: string;
  usuarioId: string;
  cuerpo: unknown;
}

export interface RespuestaOperacion {
  status: number;
  body: unknown;
}

export interface RespuestaIdempotente extends RespuestaOperacion {
  /** `true` si es la respuesta guardada de una ejecución anterior. */
  reutilizada: boolean;
}

export async function ejecutarIdempotente(
  solicitud: SolicitudIdempotenteInput,
  operacion: () => Promise<RespuestaOperacion>,
): Promise<RespuestaIdempotente> {
  const hash = hashDeCuerpo(solicitud.cuerpo);
  const usuarioId = solicitud.usuarioId.toLowerCase();

  // Dos intentos: si la clave desaparece entre `reservar` y `findByClave`
  // (otro cliente la liberó tras un fallo) se vuelve a reservar una vez.
  for (let intento = 0; intento < 2; intento++) {
    const reservada = await repository.reservar({
      clave: solicitud.clave,
      endpoint: solicitud.endpoint,
      usuarioId,
      hashSolicitud: hash,
    });

    if (reservada) {
      return ejecutarYGuardar(solicitud.clave, operacion);
    }

    const existente = await repository.findByClave(solicitud.clave);

    if (!existente) {
      continue;
    }

    if (
      existente.endpoint !== solicitud.endpoint ||
      existente.usuarioId !== usuarioId ||
      existente.hashSolicitud !== hash
    ) {
      throw new IdempotenciaCuerpoDistintoError(
        "La Idempotency-Key ya se usó con una solicitud distinta",
      );
    }

    if (existente.estado === "EN_PROCESO") {
      throw new IdempotenciaEnProcesoError(
        "Una solicitud con esta Idempotency-Key todavía se está procesando",
      );
    }

    return {
      status: existente.codigoRespuesta ?? 200,
      body: existente.cuerpoRespuesta
        ? JSON.parse(existente.cuerpoRespuesta)
        : null,
      reutilizada: true,
    };
  }

  throw new IdempotenciaEnProcesoError(
    "No se pudo reservar la Idempotency-Key; reintente",
  );
}

async function ejecutarYGuardar(
  clave: string,
  operacion: () => Promise<RespuestaOperacion>,
): Promise<RespuestaIdempotente> {
  let respuesta: RespuestaOperacion;

  try {
    respuesta = await operacion();
  } catch (error) {
    await repository.liberar(clave);
    throw error;
  }

  if (respuesta.status >= 400) {
    await repository.liberar(clave);
    return { ...respuesta, reutilizada: false };
  }

  await repository.completar(clave, respuesta.status, JSON.stringify(respuesta.body ?? null));

  return { ...respuesta, reutilizada: false };
}
