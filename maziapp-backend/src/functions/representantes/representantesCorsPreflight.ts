import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para las rutas de Representantes
 * -- Fase Representantes.
 *
 * Mismo código y mismo criterio que corsPreflight.ts (Fase 3.2),
 * duplicado deliberadamente aquí en vez de importado desde ese
 * archivo: así no se modifica corsPreflight.ts ni su registro
 * existente para `contactos/{id?}` (que no cubre esta ruta anidada de
 * 3+ segmentos). Igual que allá: NO pasa por withAuth/validateToken --
 * el preflight es una verificación del navegador (estándar fetch/
 * CORS), no una operación de negocio.
 */
async function representantesCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("representantesCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  // {representanteId?} opcional cubre en una sola ruta tanto
  // GET/POST /api/contactos/{contactoId}/representantes como
  // DELETE /api/contactos/{contactoId}/representantes/{representanteId}
  // -- mismo patrón de parámetro opcional ya usado en
  // corsPreflight.ts/getContactos.ts (`contactos/{id?}`).
  route: "contactos/{contactoId}/representantes/{representanteId?}",

  handler: representantesCorsPreflight,
});
