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
import { listarOutboxQuerySchema } from "../../validators/esb.validator";

import * as esbService from "../../services/esb/esb.service";

/**
 * 📋 GET /api/esb/outbox — ESB lógico.
 *
 * Inspección paginada del outbox transaccional, de lo más reciente a lo
 * más antiguo, con filtros por `estado` y `tipoEvento`.
 */
const getOutboxHandler = withAuth(
  ESB_ROLES_ADMIN,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarOutboxQuerySchema.safeParse({
        estado: req.query.get("estado") ?? undefined,
        tipoEvento: req.query.get("tipoEvento") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getOutbox", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Filtros del outbox inválidos", parsed.error);
      }

      return {
        status: 200,

        jsonBody: await esbService.listarOutbox(parsed.data),
      };
    } catch (error) {
      context.error("Error consultando el outbox", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error consultando el outbox",
        },
      };
    }
  },
);

export const getOutbox = withCors(getOutboxHandler);

app.http("getOutbox", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "esb/outbox",

  handler: getOutbox,
});
