import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { COMISIONES_ROLES_LECTURA } from "../../config/roles";
import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import * as comisionesService from "../../services/comisiones/comisiones.service";
import { respuestaValidacion } from "../../utils/httpResponses";
import { listarComisionesQuerySchema } from "../../validators/comisiones.validator";

/**
 * 📋 GET /api/comisiones — S16/S17.
 *
 * El freelance solo ve sus comisiones; Dirección Comercial, Administración
 * y Gerencia General ven todas.
 */
const getComisionesHandler = withAuth(
  COMISIONES_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarComisionesQuerySchema.safeParse({
        estado: req.query.get("estado") ?? undefined,
        freelanceId: req.query.get("freelanceId") ?? undefined,
        desde: req.query.get("desde") ?? undefined,
        hasta: req.query.get("hasta") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getComisiones", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion(
          "Filtros de comisiones inválidos",
          parsed.error,
        );
      }

      const resultado = await comisionesService.listarComisiones(
        user,
        parsed.data,
      );

      return {
        status: 200,
        jsonBody: resultado,
      };
    } catch (error) {
      context.error("Error listando comisiones", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error listando comisiones",
        },
      };
    }
  },
);

export const getComisiones = withCors(getComisionesHandler);

app.http("getComisiones", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "comisiones",
  handler: getComisiones,
});
