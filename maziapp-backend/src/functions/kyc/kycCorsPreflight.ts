import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Preflight CORS (OPTIONS) de las rutas de KYC — S12/S13.
 *
 * Igual que `pipelineCorsPreflight.ts`: NO pasa por `withAuth` ni por
 * `validateToken`. El preflight es una verificación del navegador, no
 * una operación de negocio, y exigir JWT en el OPTIONS rompería CORS.
 * Se registra una ruta explícita por endpoint, sin comodines.
 */

const RUTAS_KYC: string[] = [
  "kyc/documentos-requeridos",
  "kyc/expedientes",
  "kyc/expedientes/{expedienteId:int}",
  "kyc/expedientes/{expedienteId:int}/documentos",
  "kyc/expedientes/{expedienteId:int}/documentos/{documentoId:int}",
  "kyc/expedientes/{expedienteId:int}/dictamen",
  "kyc/expedientes/{expedienteId:int}/sla",
];

async function kycCorsPreflight(
  req: HttpRequest,
  _context: InvocationContext,
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

  return `kycCorsPreflight_${slug}`;
}

for (const route of RUTAS_KYC) {
  app.http(nombreFuncion(route), {
    methods: ["OPTIONS"],

    authLevel: "anonymous",

    route,

    handler: kycCorsPreflight,
  });
}
