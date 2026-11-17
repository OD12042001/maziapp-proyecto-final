import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { PIPELINE_ROLES_ESCRITURA } from "../../config/roles";
import { obtenerCorrelationId } from "../../utils/correlation";
import { perderOportunidadSchema } from "../../validators/pipeline.validator";

import * as pipelineService from "../../services/pipeline/pipeline.service";
import { PipelineOportunidadCerradaError } from "../../services/pipeline/pipeline.service";

/**
 * ❌ POST /api/pipeline/oportunidades/{oportunidadId}/perder — S06.
 *
 * Cierra la oportunidad como PERDIDA sin moverla de etapa: la etapa
 * alcanzada es evidencia del avance comercial, y el motivo del cierre
 * queda en la propia fila. No genera hito de etapa; la operación la
 * registra la auditoría (S40).
 *
 *   400 — cuerpo inválido (Zod: `motivo` de 3 a 300 caracteres).
 *   404 — no existe o no es de la cartera del usuario.
 *   409 — la oportunidad ya está cerrada.
 *   200 — oportunidad en estado PERDIDA.
 */
const perderOportunidadHandler = withAuth(
  PIPELINE_ROLES_ESCRITURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      let rawBody: unknown;

      try {
        rawBody = await req.json();
      } catch {
        return {
          status: 400,

          jsonBody: {
            message: "Cuerpo JSON inválido",
          },
        };
      }

      const parsed = perderOportunidadSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en perderOportunidad", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        const flattened = parsed.error.flatten();

        return {
          status: 400,

          jsonBody: {
            message: "Datos de pérdida inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const actualizada = await pipelineService.marcarPerdida(
        req.params.oportunidadId,
        parsed.data,
        user,
      );

      if (!actualizada) {
        return {
          status: 404,

          jsonBody: {
            message: "Oportunidad no encontrada",
          },
        };
      }

      context.log("Oportunidad marcada como perdida", {
        oid: user?.oid,
        oportunidadId: actualizada.oportunidadId,
      });

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: actualizada,
      };
    } catch (error: any) {
      if (error instanceof PipelineOportunidadCerradaError) {
        context.warn("Pérdida rechazada: oportunidad ya cerrada", {
          oid: user?.oid,
        });

        return {
          status: 409,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error marcando oportunidad como perdida", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error marcando la oportunidad como perdida",
        },
      };
    }
  },
);

export const perderOportunidad = withCors(perderOportunidadHandler);

app.http("perderOportunidad", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades/{oportunidadId:int}/perder",

  handler: perderOportunidad,
});
