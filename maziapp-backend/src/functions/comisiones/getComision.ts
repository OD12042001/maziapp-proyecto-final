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

/**
 * 🔎 GET /api/comisiones/{comisionId} — S16/S17.
 *
 *   404 — no existe o no pertenece a la cartera del usuario.
 *   200 — comisión con su reversión, si existe.
 */
const getComisionHandler = withAuth(
  COMISIONES_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const comision = await comisionesService.obtenerComision(
        req.params.comisionId,
        user,
      );

      if (!comision) {
        return {
          status: 404,
          jsonBody: {
            message: "Comisión no encontrada",
          },
        };
      }

      return {
        status: 200,
        jsonBody: comision,
      };
    } catch (error) {
      context.error("Error obteniendo la comisión", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error obteniendo la comisión",
        },
      };
    }
  },
);

export const getComision = withCors(getComisionHandler);

app.http("getComision", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "comisiones/{comisionId:int}",
  handler: getComision,
});
