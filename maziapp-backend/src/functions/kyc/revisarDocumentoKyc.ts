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
import { revisarDocumentoSchema } from "../../validators/kyc.validator";
import { respuestaDeErrorKyc } from "./kycErrors";

import * as kycService from "../../services/kyc/kyc.service";

/**
 * ✅ PATCH /api/kyc/expedientes/{expedienteId}/documentos/{documentoId}
 *
 * Cambia el estado de revisión de un documento. El freelance asignado
 * puede registrar RECIBIDO; pasar a VALIDADO o RECHAZADO es exclusivo de
 * compliance (`kyc.service.ts` lo impone con 403).
 *
 *   400 — cuerpo inválido (rechazo sin observación incluido).
 *   403 — el rol intenta validar o rechazar.
 *   404 — expediente o documento no encontrado/no visible.
 *   409 — transición no permitida desde el estado actual.
 *   200 — documento actualizado.
 */
const revisarDocumentoKycHandler = withAuth(
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

      const parsed = revisarDocumentoSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en revisarDocumentoKyc", {
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
            message: "Datos de revisión inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const documento = await kycService.revisarDocumento(
        req.params.expedienteId,
        req.params.documentoId,
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

      context.log("Documento KYC revisado", {
        oid: user?.oid,
        kycExpedienteId: req.params.expedienteId,
        kycDocumentoId: documento.kycDocumentoId,
        estado: documento.estado,
      });

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: documento,
      };
    } catch (error: any) {
      const respuesta = respuestaDeErrorKyc(error);

      if (respuesta) {
        context.warn("Revisión documental KYC rechazada", {
          oid: user?.oid,
          motivo: error.name,
        });

        return respuesta;
      }

      context.error("Error revisando documento KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error revisando el documento",
        },
      };
    }
  },
);

export const revisarDocumentoKyc = withCors(revisarDocumentoKycHandler);

app.http("revisarDocumentoKyc", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "kyc/expedientes/{expedienteId:int}/documentos/{documentoId:int}",

  handler: revisarDocumentoKyc,
});
