import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { PIPELINE_ROLES_LECTURA } from "../../config/roles";
import { obtenerCorrelationId } from "../../utils/correlation";

import * as pipelineService from "../../services/pipeline/pipeline.service";

/**
 * 🕘 GET /api/pipeline/oportunidades/{oportunidadId}/historial — S06.
 *
 * Devuelve el arreglo de transiciones en orden cronológico ascendente.
 * La primera entrada (alta de la oportunidad) tiene `etapaOrigen: null`.
 * El mismo 404 cubre "no existe" y "no es visible para el usuario".
 */
const getHistorialOportunidadHandler = withAuth(
  PIPELINE_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const historial = await pipelineService.obtenerHistorial(
        req.params.oportunidadId,
        user,
      );

      if (!historial) {
        return {
          status: 404,

          jsonBody: {
            message: "Oportunidad no encontrada",
          },
        };
      }

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: historial,
      };
    } catch (error) {
      context.error("Error obteniendo historial de la oportunidad", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo el historial",
        },
      };
    }
  },
);

export const getHistorialOportunidad = withCors(getHistorialOportunidadHandler);

app.http("getHistorialOportunidad", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades/{oportunidadId:int}/historial",

  handler: getHistorialOportunidad,
});
