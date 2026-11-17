import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { buildCorsHeaders } from "../../middleware/cors";

/**
 * Maneja el preflight CORS (OPTIONS) para `/api/ciiu` -- Fase
 * Actividad. Mismo código y mismo criterio que ubigeoCorsPreflight.ts.
 * NO pasa por withAuth/validateToken.
 */
async function ciiuCorsPreflight(
  req: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 204,
    headers: buildCorsHeaders(req),
  };
}

app.http("ciiuCorsPreflight", {
  methods: ["OPTIONS"],

  authLevel: "anonymous",

  route: "ciiu",

  handler: ciiuCorsPreflight,
});
