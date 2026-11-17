import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { KYC_ROLES_ACCESO } from "../../config/roles";
import { obtenerCorrelationId } from "../../utils/correlation";
import { listarExpedientesQuerySchema } from "../../validators/kyc.validator";

import * as kycService from "../../services/kyc/kyc.service";

/**
 * 📋 GET /api/kyc/expedientes — S12/S13.
 *
 * Listado paginado. La visibilidad la resuelve el servicio: compliance
 * ve todo; el freelance queda acotado a la cartera de sus oportunidades
 * aunque intente filtrar por otra.
 */
const getExpedientesKycHandler = withAuth(
  KYC_ROLES_ACCESO,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarExpedientesQuerySchema.safeParse({
        estado: req.query.get("estado") ?? undefined,
        contactoId: req.query.get("contactoId") ?? undefined,
        oportunidadId: req.query.get("oportunidadId") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getExpedientesKyc", {
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

      const resultado = await kycService.listarExpedientes(user, parsed.data);

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: resultado,
      };
    } catch (error) {
      context.error("Error listando expedientes KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error listando expedientes KYC",
        },
      };
    }
  },
);

export const getExpedientesKyc = withCors(getExpedientesKycHandler);

app.http("getExpedientesKyc", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "kyc/expedientes",

  handler: getExpedientesKyc,
});
