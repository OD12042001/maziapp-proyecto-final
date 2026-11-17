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
import { crearExpedienteSchema } from "../../validators/kyc.validator";
import { respuestaDeErrorKyc } from "./kycErrors";

import * as kycService from "../../services/kyc/kyc.service";

/**
 * 📁 POST /api/kyc/expedientes — S12.
 *
 * Genera el expediente de una oportunidad y su checklist desde el
 * catálogo activo. Una oportunidad tiene un solo expediente: repetir la
 * operación devuelve 409 (la carrera la resuelve el UNIQUE de la base).
 *
 *   400 — cuerpo inválido.
 *   404 — la oportunidad no existe o no es de la cartera del usuario.
 *   409 — ya existe expediente o la oportunidad está cerrada.
 *   201 — expediente con checklist y SLA.
 */
const createExpedienteKycHandler = withAuth(
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

      const parsed = crearExpedienteSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en createExpedienteKyc", {
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
            message: "Datos del expediente inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const correlationId = obtenerCorrelationId(req, context.invocationId);

      const creado = await kycService.crearExpediente(parsed.data, user);

      if (!creado) {
        return {
          status: 404,

          jsonBody: {
            message: "Oportunidad no encontrada",
          },
        };
      }

      context.log("Expediente KYC creado", {
        oid: user?.oid,
        kycExpedienteId: creado.kycExpedienteId,
        oportunidadId: creado.oportunidadId,
      });

      return {
        status: 201,

        headers: {
          "X-Correlation-Id": correlationId,
        },

        jsonBody: creado,
      };
    } catch (error: any) {
      const respuesta = respuestaDeErrorKyc(error);

      if (respuesta) {
        context.warn("Alta de expediente KYC rechazada", {
          oid: user?.oid,
          motivo: error.name,
        });

        return respuesta;
      }

      context.error("Error creando expediente KYC", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando el expediente KYC",
        },
      };
    }
  },
);

export const createExpedienteKyc = withCors(createExpedienteKycHandler);

app.http("createExpedienteKyc", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "kyc/expedientes",

  handler: createExpedienteKyc,
});
