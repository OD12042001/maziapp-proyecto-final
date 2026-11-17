import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas de Cierres — S15.
 *
 * Igual que `pipelineCorsPreflight.ts`: NO pasa por `withAuth` y registra
 * una ruta explícita por endpoint, sin comodines.
 */

const RUTAS_CIERRES: string[] = [
  "cierres",
  "cierres/{cierreId:int}",
];

async function cierresCorsPreflight(
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
  return `cierresCorsPreflight_${slug}`;
}

for (const route of RUTAS_CIERRES) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],
    authLevel: "anonymous",
    route,
    handler: cierresCorsPreflight,
  });
}
