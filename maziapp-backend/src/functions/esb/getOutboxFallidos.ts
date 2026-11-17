import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { ESB_ROLES_ADMIN } from "../../config/roles";
import { respuestaValidacion } from "../../utils/httpResponses";
import { listarOutboxFallidosQuerySchema } from "../../validators/esb.validator";

import * as esbService from "../../services/esb/esb.service";

/**
 * ☠️ GET /api/esb/outbox/fallidos — ESB lógico.
 *
 * Cola de mensajes fallidos: los que agotaron `ESB_MAX_REINTENTOS` y
 * quedaron en estado `MUERTO`. El despachador ya no los toma solo.
 */
const getOutboxFallidosHandler = withAuth(
  ESB_ROLES_ADMIN,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarOutboxFallidosQuerySchema.safeParse({
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getOutboxFallidos", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Paginación inválida", parsed.error);
      }

      return {
        status: 200,

        jsonBody: await esbService.listarFallidos(parsed.data),
      };
    } catch (error) {
      context.error("Error consultando la cola de fallidos", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error consultando la cola de fallidos",
        },
      };
    }
  },
);

export const getOutboxFallidos = withCors(getOutboxFallidosHandler);

app.http("getOutboxFallidos", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "esb/outbox/fallidos",

  handler: getOutboxFallidos,
});
