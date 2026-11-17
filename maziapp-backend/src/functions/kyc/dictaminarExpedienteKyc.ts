import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { KYC_ROLES_DICTAMEN } from "../../config/roles";
import { obtenerCorrelationId } from "../../utils/correlation";
import { dictamenSchema } from "../../validators/kyc.validator";
import { respuestaDeErrorKyc } from "./kycErrors";

import * as kycService from "../../services/kyc/kyc.service";

/**
 * ⚖️ POST /api/kyc/expedientes/{expedienteId}/dictamen — S12/S13.
 *
 * EXCLUSIVO DE COMPLIANCE. El dictamen es final:
 * - VALIDADO exige todos los documentos obligatorios VALIDADOS (409);
 * - RECHAZADO exige observación (400);
 * - el estado y la fecha se escriben en la misma sentencia, porque la
 *   base rechaza un dictamen sin fecha (`CK_KycExpedientes_Dictamen`);
 * - un expediente ya dictaminado no admite otro (409).
 */
const dictaminarExpedienteKycHandler = withAuth(
  KYC_ROLES_DICTAMEN,

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

      const parsed = dictamenSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en dictaminarExpedienteKyc", {
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
            message: "Datos del dictamen inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const dictaminado = await kycService.dictaminar(
        req.params.expedienteId,
        parsed.data,
        user,
      );

      if (!dictaminado) {
        return {
          status: 404,

          jsonBody: {
            message: "Expediente KYC no encontrado",
          },
        };
      }

      context.log("Dictamen KYC emitido", {
        oid: user?.oid,
        kycExpedienteId: dictaminado.kycExpedienteId,
        estado: dictaminado.estado,
      });

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: dictaminado,
      };
    } catch (error: any) {
      const respuesta = respuestaDeErrorKyc(error);

      if (respuesta) {
        context.warn("Dictamen KYC rechazado", {
          oid: user?.oid,
          motivo: error.name,
        });

        return respuesta;
      }

      context.error("Error emitiendo dictamen KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error emitiendo el dictamen KYC",
        },
      };
    }
  },
);

export const dictaminarExpedienteKyc = withCors(
  dictaminarExpedienteKycHandler,
);

app.http("dictaminarExpedienteKyc", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "kyc/expedientes/{expedienteId:int}/dictamen",

  handler: dictaminarExpedienteKyc,
});
