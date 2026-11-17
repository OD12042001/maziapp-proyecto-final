import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { ESB_ROLES_ADMIN } from "../../config/roles";
import { identificadorBigintSchema } from "../../validators/esb.validator";

import * as esbService from "../../services/esb/esb.service";

/**
 * 🔎 GET /api/esb/outbox/{outboxId} — ESB lógico.
 *
 * Un mensaje con su payload, intentos y último error.
 *
 *   404 — no existe, o el identificador no es un `bigint` válido.
 */
const getOutboxEventoHandler = withAuth(
  ESB_ROLES_ADMIN,

  async (
    req: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    try {
      const id = identificadorBigintSchema.safeParse(req.params.outboxId);

      const evento = id.success ? await esbService.obtenerOutbox(id.data) : null;

      if (!evento) {
        return {
          status: 404,

          jsonBody: {
            message: "Mensaje del outbox no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: evento,
      };
    } catch (error) {
      context.error("Error obteniendo el mensaje del outbox", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo el mensaje del outbox",
        },
      };
    }
  },
);

export const getOutboxEvento = withCors(getOutboxEventoHandler);

app.http("getOutboxEvento", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "esb/outbox/{outboxId:long}",

  handler: getOutboxEvento,
});
