import { HttpResponseInit } from "@azure/functions";

import {
  KycAccionReservadaError,
  KycDictamenIncompletoError,
  KycEstadoNoPermitidoError,
  KycExpedienteDuplicadoError,
  KycOportunidadNoActivaError,
} from "../../services/kyc/kyc.service";

/**
 * Traducción de errores de negocio de KYC a respuestas HTTP.
 *
 * Vive fuera de los handlers para que los ocho endpoints apliquen el
 * mismo criterio:
 *   403 — acción reservada a compliance (`ForbiddenResponse` del
 *         contrato; el `message` extra explica el motivo sin filtrar
 *         datos internos).
 *   409 — la operación contradice el estado actual o una regla de
 *         negocio (`ErrorMessage`).
 *   null — error no esperado: cada handler decide su 500 y loguea.
 */
export function respuestaDeErrorKyc(error: any): HttpResponseInit | null {
  if (error instanceof KycAccionReservadaError) {
    return {
      status: 403,

      jsonBody: {
        error: "Forbidden",
        message: error.message,
      },
    };
  }

  if (
    error instanceof KycExpedienteDuplicadoError ||
    error instanceof KycOportunidadNoActivaError ||
    error instanceof KycEstadoNoPermitidoError ||
    error instanceof KycDictamenIncompletoError
  ) {
    return {
      status: 409,

      jsonBody: {
        message: error.message,
      },
    };
  }

  return null;
}
