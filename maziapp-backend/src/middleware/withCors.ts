import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

import { buildCorsHeaders } from "./cors";
import { obtenerCorrelationId } from "../utils/correlation";
import {
  ejecutarConContexto,
  extraerDireccionIp,
  extraerUserAgent,
} from "../utils/requestContext";

type AzureFunctionHandler = (
  req: HttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit>;

/**
 * Envuelve cualquier handler de Azure Functions para (a) adjuntar los
 * headers CORS correctos (Fase 3.2) a la respuesta que produzca —
 * incluyendo las respuestas 401/403 que genera `withAuth.ts` — y (b)
 * abrir el contexto de la solicitud con su `X-Correlation-Id` (S40).
 *
 * 🔐 Implementado deliberadamente como una envoltura EXTERNA a
 * `withAuth`/`validateToken`: no toca la lógica de autenticación ni de
 * autorización, solo agrega headers a la respuesta que esos módulos ya
 * producen. Uso: `withCors(withAuth(roles, handler))`.
 *
 * Correlación (S40): el cliente puede enviar `X-Correlation-Id`; si no
 * llega o no es válido (ver `utils/correlation.ts`), se usa el id de la
 * invocación. El valor efectivo se devuelve SIEMPRE en la respuesta,
 * también en errores 4xx/5xx, y viaja por el contexto hasta la
 * auditoría y el outbox.
 */
export function withCors(handler: AzureFunctionHandler): AzureFunctionHandler {
  return async (req, context) => {
    const correlationId = obtenerCorrelationId(req, context.invocationId);

    const result = await ejecutarConContexto(
      {
        correlationId,
        direccionIp: extraerDireccionIp(req),
        userAgent: extraerUserAgent(req),
      },
      () => handler(req, context),
    );

    return {
      ...result,
      headers: {
        "X-Correlation-Id": correlationId,
        ...(result.headers || {}),
        ...buildCorsHeaders(req),
      },
    };
  };
}
