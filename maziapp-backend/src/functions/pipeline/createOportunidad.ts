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
import { crearOportunidadSchema } from "../../validators/pipeline.validator";

import * as pipelineService from "../../services/pipeline/pipeline.service";
import {
  PipelineMonedaInvalidaError,
  PipelineSinEtapaInicialError,
} from "../../services/pipeline/pipeline.service";

/**
 * ➕ POST /api/pipeline/oportunidades — S06.
 *
 * Flujo (Zod `.strict()` primero, luego `pipeline.service.ts`):
 *   - 400 si el cuerpo no es JSON válido o no pasa Zod. `.strict()`
 *     rechaza `responsableId`, `etapaId` y `estado`: el dueño de la
 *     oportunidad, la etapa inicial y el estado los decide el servidor.
 *   - 404 si el contacto no existe o no es del usuario autenticado
 *     (anti-enumeración: mismo 404 en ambos casos).
 *   - 400 si la moneda no existe/está inactiva, o si se informa monto
 *     sin moneda.
 *   - 201 con la oportunidad creada y su etapa inicial resuelta.
 */
const createOportunidadHandler = withAuth(
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

      const parsed = crearOportunidadSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en createOportunidad", {
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
            message: "Datos de oportunidad inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const creada = await pipelineService.crearOportunidad(
        parsed.data,
        user,
        correlationId,
      );

      if (!creada) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      context.log("Oportunidad creada", {
        oid: user?.oid,
        oportunidadId: creada.oportunidadId,
        contactoId: creada.contactoId,
      });

      return {
        status: 201,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: creada,
      };
    } catch (error: any) {
      if (error instanceof PipelineMonedaInvalidaError) {
        context.warn("Alta de oportunidad rechazada: moneda inválida", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      if (error instanceof PipelineSinEtapaInicialError) {
        // No es un error del cliente: el catálogo quedó sin etapas
        // activas. Se loggea como error y se responde genérico.
        context.error("Catálogo de etapas sin etapas activas", error);

        return {
          status: 500,

          jsonBody: {
            message: "Error creando la oportunidad",
          },
        };
      }

      context.error("Error creando oportunidad", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando la oportunidad",
        },
      };
    }
  },
);

export const createOportunidad = withCors(createOportunidadHandler);

app.http("createOportunidad", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades",

  handler: createOportunidad,
});
