import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de la ruta de Saga BPM.
 */

const RUTAS_SAGA: string[] = ["sagas/{correlationId}"];

async function sagaCorsPreflight(
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
  return `sagaCorsPreflight_${slug}`;
}

for (const route of RUTAS_SAGA) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],
    authLevel: "anonymous",
    route,
    handler: sagaCorsPreflight,
  });
}
