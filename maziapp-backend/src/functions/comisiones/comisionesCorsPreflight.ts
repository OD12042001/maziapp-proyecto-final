import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas de Comisiones — S16/S17.
 */

const RUTAS_COMISIONES: string[] = [
  "comisiones",
  "comisiones/{comisionId:int}",
  "comisiones/{comisionId:int}/reversion",
];

async function comisionesCorsPreflight(
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
  return `comisionesCorsPreflight_${slug}`;
}

for (const route of RUTAS_COMISIONES) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],
    authLevel: "anonymous",
    route,
    handler: comisionesCorsPreflight,
  });
}
