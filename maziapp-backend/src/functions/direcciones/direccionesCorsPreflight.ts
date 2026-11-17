import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para las rutas de Direcciones --
 * Fase Direcciones.
 *
 * Mismo código y mismo criterio que representantesCorsPreflight.ts,
 * duplicado deliberadamente aquí en vez de modificar corsPreflight.ts:
 * así no se toca el registro existente para `contactos/{id?}` (que no
 * cubre esta ruta anidada de 3+ segmentos). Igual que allá: NO pasa
 * por withAuth/validateToken -- el preflight es una verificación del
 * navegador, no una operación de negocio.
 */
async function direccionesCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("direccionesCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  // {direccionId?} opcional cubre en una sola ruta tanto
  // GET/POST /api/contactos/{contactoId}/direcciones como
  // PATCH/DELETE /api/contactos/{contactoId}/direcciones/{direccionId}
  // -- mismo patrón de parámetro opcional que
  // representantesCorsPreflight.ts.
  route: "contactos/{contactoId}/direcciones/{direccionId?}",

  handler: direccionesCorsPreflight,
});
