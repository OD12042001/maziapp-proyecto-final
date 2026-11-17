import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas del ESB lógico.
 *
 * Igual que `pipelineCorsPreflight.ts`: NO pasa por `withAuth` y registra
 * una ruta explícita por endpoint, sin comodines.
 */

const RUTAS_ESB: string[] = [
  "esb/outbox",
  "esb/outbox/fallidos",
  "esb/outbox/procesar",
  "esb/outbox/{outboxId:long}",
];

async function esbCorsPreflight(
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

  return `esbCorsPreflight_${slug}`;
}

for (const route of RUTAS_ESB) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],

    authLevel: "anonymous",

    route,

    handler: esbCorsPreflight,
  });
}
