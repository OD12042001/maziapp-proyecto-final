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
import { registrarRecepcionSchema } from "../../validators/kyc.validator";
import { respuestaDeErrorKyc } from "./kycErrors";

import * as kycService from "../../services/kyc/kyc.service";

/**
 * 📎 POST /api/kyc/expedientes/{expedienteId}/documentos — S12.
 *
 * Registra la recepción de un documento del checklist. El binario no
 * viaja: se guarda una referencia al repositorio documental. Repetir la
 * recepción es idempotente mientras el documento no haya sido revisado.
 *
 *   400 — cuerpo inválido.
 *   404 — expediente no visible o documento fuera del checklist.
 *   409 — expediente dictaminado, documento ya revisado, o carrera.
 *   201 — documento actualizado.
 */
const registrarDocumentoKycHandler = withAuth(
  KYC_ROLES_ACCESO,

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

      const parsed = registrarRecepcionSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en registrarDocumentoKyc", {
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
            message: "Datos del documento inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const documento = await kycService.registrarRecepcion(
        req.params.expedienteId,
        parsed.data,
        user,
      );

      if (!documento) {
        return {
          status: 404,

          jsonBody: {
            message: "Expediente o documento no encontrado",
          },
        };
      }

      context.log("Documento KYC recibido", {
        oid: user?.oid,
        kycExpedienteId: req.params.expedienteId,
        kycDocumentoId: documento.kycDocumentoId,
      });

      return {
        status: 201,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: documento,
      };
    } catch (error: any) {
      const respuesta = respuestaDeErrorKyc(error);

      if (respuesta) {
        context.warn("Recepción documental KYC rechazada", {
          oid: user?.oid,
          motivo: error.name,
        });

        return respuesta;
      }

      context.error("Error registrando recepción documental KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error registrando la recepción del documento",
        },
      };
    }
  },
);

export const registrarDocumentoKyc = withCors(registrarDocumentoKycHandler);

app.http("registrarDocumentoKyc", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "kyc/expedientes/{expedienteId:int}/documentos",

  handler: registrarDocumentoKyc,
});
