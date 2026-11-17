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
 * 📋 GET /api/kyc/documentos-requeridos — S12.
 *
 * Catálogo configurable del checklist. Devuelve también los documentos
 * inactivos (`activo: false`): el contrato los expone y el cliente
 * necesita distinguir "ya no se exige" de "no existe". El alta de un
 * expediente solo genera filas para los activos.
 */
const getDocumentosRequeridosKycHandler = withAuth(
  KYC_ROLES_ACCESO,

  async (
    req: HttpRequest,
    context: InvocationContext,
    _user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const documentos = await kycService.listarDocumentosRequeridos();

      return {
        status: 200,

        headers: {
          "X-Correlation-Id": obtenerCorrelationId(req, context.invocationId),
        },

        jsonBody: documentos,
      };
    } catch (error) {
      context.error("Error listando documentos requeridos KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error listando el catálogo KYC",
        },
      };
    }
  },
);

export const getDocumentosRequeridosKyc = withCors(
  getDocumentosRequeridosKycHandler,
);

app.http("getDocumentosRequeridosKyc", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "kyc/documentos-requeridos",

  handler: getDocumentosRequeridosKyc,
});
