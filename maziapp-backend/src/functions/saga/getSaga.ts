import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { SAGA_ROLES_LECTURA } from "../../config/roles";
import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import * as sagaService from "../../services/saga/saga.service";
import { correlationIdPathSchema } from "../../validators/saga.validator";

/**
 * 🧭 GET /api/sagas/{correlationId} — Saga BPM (requisito S4).
 *
 * Devuelve la instancia de saga y sus pasos ordenados para evidenciar la
 * relación Proceso empresarial → Servicios SOA.
 *
 *   404 — no existe, el `correlationId` no es válido o la oportunidad no
 *         pertenece a la cartera del usuario (anti-enumeración).
 *   200 — instancia de saga con sus pasos.
 */
const getSagaHandler = withAuth(
  SAGA_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = correlationIdPathSchema.safeParse(
        req.params.correlationId,
      );

      if (!parsed.success) {
        return {
          status: 404,
          jsonBody: {
            message: "Instancia de saga no encontrada",
          },
        };
      }

      const saga = await sagaService.obtenerSaga(parsed.data, user);

      if (!saga) {
        return {
          status: 404,
          jsonBody: {
            message: "Instancia de saga no encontrada",
          },
        };
      }

      return {
        status: 200,
        jsonBody: saga,
      };
    } catch (error) {
      context.error("Error obteniendo la instancia de saga", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error obteniendo la instancia de saga",
        },
      };
    }
  },
);

export const getSaga = withCors(getSagaHandler);

app.http("getSaga", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "sagas/{correlationId}",
  handler: getSaga,
});
