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

import * as kycService from "../../services/kyc/kyc.service";

/**
 * 🔎 GET /api/kyc/expedientes/{expedienteId} — S12/S13.
 *
 * Detalle con checklist y SLA. Solo lo ven compliance y el freelance
 * dueño de la oportunidad; el resto recibe el mismo 404 que un id
 * inexistente (anti-enumeración).
 */
const getExpedienteKycHandler = withAuth(
  KYC_ROLES_ACCESO,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const expediente = await kycService.obtenerExpediente(
        req.params.expedienteId,
        user,
      );

      if (!expediente) {
        return {
          status: 404,

          jsonBody: {
            message: "Expediente KYC no encontrado",
          },
        };
      }

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: expediente,
      };
    } catch (error) {
      context.error("Error obteniendo expediente KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error obteniendo el expediente KYC",
        },
      };
    }
  },
);

export const getExpedienteKyc = withCors(getExpedienteKycHandler);

app.http("getExpedienteKyc", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "kyc/expedientes/{expedienteId:int}",

  handler: getExpedienteKyc,
});
