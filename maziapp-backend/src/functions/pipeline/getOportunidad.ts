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
 * 🔍 GET /api/pipeline/oportunidades/{oportunidadId} — S06.
 *
 * La ruta está restringida a `{oportunidadId:int}`, así que el runtime
 * ya descartó cualquier id no numérico antes de llegar aquí. Un id
 * válido pero inexistente, ajeno, o fuera de la cartera del usuario
 * devuelve el mismo 404 (anti-enumeración).
 */
const getOportunidadHandler = withAuth(
  PIPELINE_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const oportunidad = await pipelineService.obtenerOportunidad(
        req.params.oportunidadId,
        user,
      );

      if (!oportunidad) {
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

        jsonBody: oportunidad,
      };
    } catch (error) {
      context.error("Error obteniendo oportunidad", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo la oportunidad",
        },
      };
    }
  },
);

export const getOportunidad = withCors(getOportunidadHandler);

app.http("getOportunidad", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades/{oportunidadId:int}",

  handler: getOportunidad,
});
