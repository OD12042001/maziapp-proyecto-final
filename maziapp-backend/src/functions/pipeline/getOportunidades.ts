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
import { listarOportunidadesQuerySchema } from "../../validators/pipeline.validator";

import * as pipelineService from "../../services/pipeline/pipeline.service";

/**
 * 📋 GET /api/pipeline/oportunidades — S06.
 *
 * Listado paginado con filtros opcionales. La visibilidad la resuelve
 * `pipeline.service.ts`: el freelance queda acotado a su propio `oid`
 * aunque envíe otro `responsableId`; Dirección Comercial y Gerencia
 * General ven todas.
 *
 * Solo se leen los parámetros declarados en el contrato. Cualquier otro
 * query string se ignora en lugar de provocar 400: los clientes agregan
 * parámetros de tracking con libertad y eso no debe romper el listado.
 */
const getOportunidadesHandler = withAuth(
  PIPELINE_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarOportunidadesQuerySchema.safeParse({
        estado: req.query.get("estado") ?? undefined,
        etapaCodigo: req.query.get("etapaCodigo") ?? undefined,
        contactoId: req.query.get("contactoId") ?? undefined,
        responsableId: req.query.get("responsableId") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getOportunidades", {
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
            message: "Filtros de búsqueda inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const resultado = await pipelineService.listarOportunidades(
        user,
        parsed.data,
      );

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: resultado,
      };
    } catch (error) {
      context.error("Error listando oportunidades", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error listando oportunidades",
        },
      };
    }
  },
);

export const getOportunidades = withCors(getOportunidadesHandler);

app.http("getOportunidades", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "pipeline/oportunidades",

  handler: getOportunidades,
});
