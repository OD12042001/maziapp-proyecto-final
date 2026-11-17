import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

import { buildCorsHeaders } from "./cors";

type AzureFunctionHandler = (
  req: HttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit>;

/**
 * Envuelve cualquier handler de Azure Functions para adjuntar los
 * headers CORS correctos (Fase 3.2) a la respuesta que produzca —
 * incluyendo las respuestas 401/403 que genera `withAuth.ts`.
 *
 * 🔐 Implementado deliberadamente como una envoltura EXTERNA a
 * `withAuth`/`validateToken`, sin modificar ninguno de esos dos
 * archivos: esta función no toca en absoluto la lógica de
 * autenticación/autorización, solo agrega headers a la respuesta que
 * esos módulos ya producen. Uso: `withCors(withAuth(roles, handler))`.
 */
export function withCors(handler: AzureFunctionHandler): AzureFunctionHandler {
  return async (req, context) => {
    const result = await handler(req, context);

    return {
      ...result,
      headers: {
        ...(result.headers || {}),
        ...buildCorsHeaders(req),
      },
    };
  };
}
