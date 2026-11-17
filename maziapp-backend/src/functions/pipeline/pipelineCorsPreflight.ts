import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas de Pipeline — S06.
 *
 * Igual que `direccionesCorsPreflight.ts`: NO pasa por `withAuth` ni por
 * `validateToken`. El preflight es una verificación del navegador, no
 * una operación de negocio, y exigir JWT en el OPTIONS rompería CORS
 * (el navegador nunca envía `Authorization` ahí). Las operaciones
 * reales siguen exigiendo JWT + rol en cada handler.
 *
 * 🔧 Se registra una ruta explícita por endpoint en lugar de un comodín
 * (`pipeline/{*resto}`). En este proyecto ya está documentado —con
 * evidencia de producción, ver `contactos/corsPreflight.ts`— que Azure
 * Functions v4 no prioriza el segmento literal sobre el parametrizado;
 * un comodín sobre `pipeline` podría capturar rutas reales.
 */

const RUTAS_PIPELINE: string[] = [
  "pipeline/etapas",
  "pipeline/oportunidades",
  "pipeline/oportunidades/{oportunidadId:int}",
  "pipeline/oportunidades/{oportunidadId:int}/avanzar",
  "pipeline/oportunidades/{oportunidadId:int}/perder",
  "pipeline/oportunidades/{oportunidadId:int}/historial",
];

async function pipelineCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

/**
 * El nombre de cada Function debe ser único y estable. Se deriva de la
 * ruta para que agregar un endpoint al arreglo de arriba no exija
 * inventar un nombre a mano.
 */
function nombreFuncion(route: string): string {
  const slug = route.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  return `pipelineCorsPreflight_${slug}`;
}

for (const route of RUTAS_PIPELINE) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],

    authLevel: "anonymous",

    route,

    handler: pipelineCorsPreflight,
  });
}
