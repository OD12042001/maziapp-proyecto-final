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
 * ⏱️ GET /api/kyc/expedientes/{expedienteId}/sla — S13.
 *
 * Recalcula en cada consulta: días completos desde `FechaInicioUtc`
 * hasta el dictamen o hasta ahora, contra `KYC_SLA_DIAS`. El umbral no
 * está codificado; si el parámetro falta, la respuesta es 500 y no un
 * SLA inventado.
 */
const getSlaKycHandler = withAuth(
  KYC_ROLES_ACCESO,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const sla = await kycService.obtenerSla(
        req.params.expedienteId,
        user,
      );

      if (!sla) {
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

        jsonBody: sla,
      };
    } catch (error) {
      context.error("Error calculando SLA de KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error calculando el SLA del expediente",
        },
      };
    }
  },
);

export const getSlaKyc = withCors(getSlaKycHandler);

app.http("getSlaKyc", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "kyc/expedientes/{expedienteId:int}/sla",

  handler: getSlaKyc,
});
