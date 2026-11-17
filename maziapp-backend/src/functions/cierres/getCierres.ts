import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { CIERRES_ROLES_LECTURA } from "../../config/roles";
import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import * as cierresService from "../../services/cierres/cierres.service";
import { respuestaValidacion } from "../../utils/httpResponses";
import { listarCierresQuerySchema } from "../../validators/cierres.validator";

/**
 * 📋 GET /api/cierres — S15.
 *
 * El freelance solo ve los cierres de su cartera; Dirección Comercial,
 * Administración y Gerencia General ven todos.
 */
const getCierresHandler = withAuth(
  CIERRES_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarCierresQuerySchema.safeParse({
        proyectoId: req.query.get("proyectoId") ?? undefined,
        freelanceId: req.query.get("freelanceId") ?? undefined,
        estado: req.query.get("estado") ?? undefined,
        desde: req.query.get("desde") ?? undefined,
        hasta: req.query.get("hasta") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getCierres", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Filtros de cierres inválidos", parsed.error);
      }

      const resultado = await cierresService.listarCierres(user, parsed.data);

      return {
        status: 200,
        jsonBody: resultado,
      };
    } catch (error) {
      context.error("Error listando cierres", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error listando cierres de inversión",
        },
      };
    }
  },
);

export const getCierres = withCors(getCierresHandler);

app.http("getCierres", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "cierres",
  handler: getCierres,
});
