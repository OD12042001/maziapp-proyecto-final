import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para `/api/contactos/empresas` --
 * Fase Actividad.
 *
 * 🔧 CORRECCIÓN DE ROUTING: archivo NUEVO, creado junto con la
 * restricción de `contactos/{id?}` a `contactos/{id:int?}` en
 * `corsPreflight.ts`/`getContactos.ts`/`updateContacto.ts`. Antes de
 * este fix, `corsPreflight.ts` (route `contactos/{id?}`) cubría
 * también el OPTIONS de esta ruta "por accidente" (matcheando
 * `id="empresas"`). Al restringir esa plantilla a solo ids numéricos,
 * `contactos/empresas` deja de tener preflight propio -- este archivo
 * lo reemplaza explícitamente, mismo criterio exacto que
 * `contactoActividadCorsPreflight.ts`/`ciiuCorsPreflight.ts`
 * (duplicado deliberado del mismo código, no una abstracción
 * compartida, para no tocar ningún registro existente).
 *
 * 🔐 Igual que el resto de preflights del proyecto: NO pasa por
 * `withAuth`/`validateToken` -- es una verificación del navegador, no
 * una operación de negocio. No amplía ni modifica en absoluto el
 * contrato ni la autorización de `getEmpresas.ts` (GET real, sin
 * cambios en este fix).
 */
async function empresasCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

export { empresasCorsPreflight };

app.http("empresasCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  route: "contactos/empresas",

  handler: empresasCorsPreflight,
});
