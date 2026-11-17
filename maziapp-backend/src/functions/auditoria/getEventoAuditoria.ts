import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { AUDITORIA_ROLES_LECTURA } from "../../config/roles";
import { identificadorBigintSchema } from "../../validators/auditoria.validator";

import * as auditoriaService from "../../services/auditoria/auditoria.service";

/**
 * 🔎 GET /api/auditoria/eventos/{eventoId} — S40.
 *
 *   404 — el evento no existe, o el identificador no es un `bigint`
 *         válido (mismo criterio que el resto del contrato: no se
 *         distingue "mal formado" de "inexistente").
 *   200 — el evento.
 */
const getEventoAuditoriaHandler = withAuth(
  AUDITORIA_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const id = identificadorBigintSchema.safeParse(req.params.eventoId);

      if (!id.success) {
        return {
          status: 404,

          jsonBody: {
            message: "Evento de auditoría no encontrado",
          },
        };
      }

      const evento = await auditoriaService.obtenerEvento(id.data);

      if (!evento) {
        return {
          status: 404,

          jsonBody: {
            message: "Evento de auditoría no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: evento,
      };
    } catch (error) {
      context.error("Error obteniendo el evento de auditoría", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo el evento de auditoría",
        },
      };
    }
  },
);

export const getEventoAuditoria = withCors(getEventoAuditoriaHandler);

app.http("getEventoAuditoria", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "auditoria/eventos/{eventoId:long}",

  handler: getEventoAuditoria,
});
