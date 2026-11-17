import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas de Auditoría — S40.
 *
 * Igual que `pipelineCorsPreflight.ts`: NO pasa por `withAuth` (el
 * navegador nunca envía `Authorization` en el OPTIONS) y registra una
 * ruta explícita por endpoint, sin comodines.
 */

const RUTAS_AUDITORIA: string[] = [
  "auditoria/eventos",
  "auditoria/eventos/{eventoId:long}",
];

async function auditoriaCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

function nombreFuncion(route: string): string {
  const slug = route.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return `auditoriaCorsPreflight_${slug}`;
}

for (const route of RUTAS_AUDITORIA) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],

    authLevel: "anonymous",

    route,

    handler: auditoriaCorsPreflight,
  });
}
