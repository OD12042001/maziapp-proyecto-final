import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para las rutas de Contactos
 * (`/api/contactos` y `/api/contactos/{id}`) — Fase 3.2.
 *
 * 🔐 Intencionalmente NO pasa por `withAuth` ni por `validateToken`:
 * el preflight es una verificación del navegador (definida por el
 * estándar fetch/CORS), no una operación de negocio. No exige JWT, no
 * valida roles, no toca la base de datos, no invoca
 * `contactoService`/`contacto.repository`. Esto es intencional y
 * correcto: exigir un JWT válido en el preflight rompería CORS por
 * completo (el navegador nunca envía Authorization en el OPTIONS), y
 * NO es un debilitamiento de la autenticación de las operaciones
 * reales — `createContacto.ts` y `getContactos.ts` siguen exigiendo
 * JWT + roles exactamente igual que antes, sin cambio alguno en esa
 * lógica.
 *
 * 🔧 CORRECCIÓN DE ROUTING (fix del bug reportado en producción de
 * Actividad): la plantilla se restringe aquí de `{id?}` a `{id:int?}`
 * porque, en la práctica (evidencia real de DevTools, no solo teoría),
 * Azure Functions v4 NO prioriza el segmento literal
 * `contactos/empresas` sobre este segmento parametrizado -- un
 * `id?` sin restricción capturaba también
 * `GET /api/contactos/empresas` (con `id="empresas"`), causando un 404
 * indebido antes de que la petición llegara a `getEmpresas.ts`. Con
 * `{id:int?}`, este handler de preflight deja de capturar cualquier
 * segmento no numérico. Por eso `OPTIONS /api/contactos/empresas` ya
 * NO pasa por aquí -- tiene su propio preflight dedicado en
 * `empresasCorsPreflight.ts` (mismo patrón que
 * `contactoActividadCorsPreflight.ts`/`ciiuCorsPreflight.ts`).
 */
async function corsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("contactosCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  // Cubre tanto POST /api/contactos (createContacto) como
  // GET /api/contactos y GET /api/contactos/{id} (getContactos) con
  // un único handler, ya que {id?} es opcional en la plantilla de ruta.
  route: "contactos/{id:int?}",

  handler: corsPreflight,
});
