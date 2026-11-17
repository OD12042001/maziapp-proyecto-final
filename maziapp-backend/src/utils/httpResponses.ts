import { HttpResponseInit } from "@azure/functions";
import { ZodError } from "zod";

/**
 * Respuesta 400 con la forma de error implementada hoy
 * (`{ message, errors: { fieldErrors, formErrors } }`), igual a la de los
 * módulos Pipeline y KYC.
 */
export function respuestaValidacion(
  message: string,
  error: ZodError,
): HttpResponseInit {
  const flattened = error.flatten();

  return {
    status: 400,

    jsonBody: {
      message,

      errors: {
        fieldErrors: flattened.fieldErrors,
        formErrors: flattened.formErrors,
      },
    },
  };
}
