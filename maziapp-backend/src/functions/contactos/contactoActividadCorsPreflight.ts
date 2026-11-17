import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para la ruta de Actividad --
 * Fase Actividad.
 *
 * Mismo código y mismo criterio que direccionesCorsPreflight.ts,
 * duplicado deliberadamente aquí: así no se toca el registro
 * existente para `contactos/{id?}` (que no cubre esta ruta anidada).
 * NO pasa por withAuth/validateToken -- el preflight es una
 * verificación del navegador, no una operación de negocio.
 */
async function contactoActividadCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("contactoActividadCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/actividad",

  handler: contactoActividadCorsPreflight,
});
