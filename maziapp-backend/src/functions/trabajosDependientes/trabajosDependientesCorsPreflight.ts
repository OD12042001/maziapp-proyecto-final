import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para las rutas de Trabajos
 * Dependientes -- Fase Trabajos Dependientes (arquitectura
 * independiente, patrón Direcciones).
 *
 * Mismo código y mismo criterio que direccionesCorsPreflight.ts,
 * duplicado deliberadamente aquí en vez de modificar corsPreflight.ts
 * general ni contactoActividadCorsPreflight.ts: así no se toca ningún
 * registro existente. Igual que allá: NO pasa por withAuth/
 * validateToken -- el preflight es una verificación del navegador, no
 * una operación de negocio.
 */
async function trabajosDependientesCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("trabajosDependientesCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  // {trabajoId?} opcional cubre en una sola ruta tanto
  // GET/POST /api/contactos/{contactoId}/trabajos-dependientes como
  // PATCH/DELETE /api/contactos/{contactoId}/trabajos-dependientes/{trabajoId}
  // -- mismo patrón de parámetro opcional que direccionesCorsPreflight.ts.
  route: "contactos/{contactoId}/trabajos-dependientes/{trabajoId?}",

  handler: trabajosDependientesCorsPreflight,
});
