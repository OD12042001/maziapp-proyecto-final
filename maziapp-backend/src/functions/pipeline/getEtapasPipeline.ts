import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { PIPELINE_ROLES_LECTURA } from "../../config/roles";

import * as pipelineService from "../../services/pipeline/pipeline.service";

/**
 * 📋 GET /api/pipeline/etapas — S06.
 *
 * Catálogo de etapas del embudo, ordenado por `Orden`. Lo consumen el
 * tablero y el selector de avance del frontend; por eso se devuelve
 * completo (incluidas las inactivas, con `activo: false`) en lugar de
 * filtrar server-side: el cliente necesita distinguir "no existe" de
 * "está desactivada".
 */
const getEtapasPipelineHandler = withAuth(
  PIPELINE_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    try {
      const etapas = await pipelineService.listarEtapas();

      return {
        status: 200,

        jsonBody: etapas,
      };
    } catch (error) {
      // Mismo criterio que el resto del backend: el detalle se loggea
      // server-side y el cliente recibe un mensaje estable.
      context.error("Error listando etapas del pipeline", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo el catálogo de etapas",
        },
      };
    }
  },
);

export const getEtapasPipeline = withCors(getEtapasPipelineHandler);

app.http("getEtapasPipeline", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "pipeline/etapas",

  handler: getEtapasPipeline,
});
