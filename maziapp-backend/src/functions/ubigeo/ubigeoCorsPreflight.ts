import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para `GET /api/distritos` -- Fase
 * Direcciones.
 *
 * Mismo código y mismo criterio que representantesCorsPreflight.ts:
 * duplicado deliberadamente en vez de modificar corsPreflight.ts (que
 * no cubre esta ruta), y sin pasar por withAuth/validateToken -- el
 * preflight es una verificación del navegador (estándar fetch/CORS),
 * no una operación de negocio.
 */
async function ubigeoCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("ubigeoCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  route: "distritos",

  handler: ubigeoCorsPreflight,
});
