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
import { avanzarEtapaSchema } from "../../validators/pipeline.validator";

import * as pipelineService from "../../services/pipeline/pipeline.service";
import {
  PipelineCierreNoHabilitadoError,
  PipelineEtapaNoSecuencialError,
  PipelineOportunidadCerradaError,
} from "../../services/pipeline/pipeline.service";

/**
 * ⏭️ POST /api/pipeline/oportunidades/{oportunidadId}/avanzar — S06.
 *
 * El cliente NOMBRA la etapa destino (`etapaDestinoCodigo`); el servicio
 * verifica que sea la inmediatamente siguiente del catálogo activo. No
 * se acepta un salto: el embudo es secuencial.
 *
 *   400 — cuerpo inválido (Zod).
 *   404 — no existe o no es de la cartera del usuario.
 *   409 — oportunidad ya cerrada, etapa no secuencial, o etapa de
 *         cierre sin KYC validado / sin cierre registrado.
 *   200 — oportunidad con su etapa nueva.
 */
const avanzarEtapaOportunidadHandler = withAuth(
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

      const parsed = avanzarEtapaSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en avanzarEtapaOportunidad", {
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
            message: "Datos de avance inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const actualizada = await pipelineService.avanzarEtapa(
        req.params.oportunidadId,
        parsed.data,
        user,
        correlationId,
      );

      if (!actualizada) {
        return {
          status: 404,

          jsonBody: {
            message: "Oportunidad no encontrada",
          },
        };
      }

      context.log("Oportunidad avanzada", {
        oid: user?.oid,
        oportunidadId: actualizada.oportunidadId,
        etapaCodigo: actualizada.etapa.codigo,
      });

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: actualizada,
      };
    } catch (error: any) {
      if (
        error instanceof PipelineOportunidadCerradaError ||
        error instanceof PipelineEtapaNoSecuencialError ||
        error instanceof PipelineCierreNoHabilitadoError
      ) {
        context.warn("Avance de etapa rechazado", {
          oid: user?.oid,
          motivo: error.name,
        });

        return {
          status: 409,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error avanzando etapa", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error avanzando la etapa",
        },
      };
    }
  },
);

export const avanzarEtapaOportunidad = withCors(avanzarEtapaOportunidadHandler);

app.http("avanzarEtapaOportunidad", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades/{oportunidadId:int}/avanzar",

  handler: avanzarEtapaOportunidad,
});
