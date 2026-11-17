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

/**
 * 🔎 GET /api/cierres/{cierreId} — S15.
 *
 *   404 — no existe o no pertenece a la cartera del usuario.
 *   200 — cierre con el estado de su comisión.
 */
const getCierreHandler = withAuth(
  CIERRES_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const cierre = await cierresService.obtenerCierre(
        req.params.cierreId,
        user,
      );

      if (!cierre) {
        return {
          status: 404,
          jsonBody: {
            message: "Cierre de inversión no encontrado",
          },
        };
      }

      return {
        status: 200,
        jsonBody: cierre,
      };
    } catch (error) {
      context.error("Error obteniendo el cierre", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error obteniendo el cierre de inversión",
        },
      };
    }
  },
);

export const getCierre = withCors(getCierreHandler);

app.http("getCierre", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "cierres/{cierreId:int}",
  handler: getCierre,
});
