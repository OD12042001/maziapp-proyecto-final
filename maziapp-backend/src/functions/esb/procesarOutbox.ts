import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { ESB_ROLES_ADMIN } from "../../config/roles";
import { respuestaValidacion } from "../../utils/httpResponses";
import { procesarOutboxSchema } from "../../validators/esb.validator";

import * as esbService from "../../services/esb/esb.service";
import { EsbNoConfiguradoError } from "../../services/esb/esb.service";

/**
 * 🚚 POST /api/esb/outbox/procesar — ESB lógico.
 *
 * Una pasada del despachador: toma hasta `limite` mensajes listos
 * (PENDIENTES, FALLIDOS con espera vencida o EN_PROCESO con
 * arrendamiento vencido), los entrega a sus consumidores y devuelve los
 * conteos. El cuerpo es opcional.
 *
 *   400 — `limite` fuera de rango o cuerpo con propiedades no declaradas.
 *   500 — falta un parámetro del ESB (`ESB_MAX_REINTENTOS`, backoff):
 *         es un problema de configuración, no del cliente.
 *   200 — `{ procesados, publicados, fallidos, muertos }`.
 */
const procesarOutboxHandler = withAuth(
  ESB_ROLES_ADMIN,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const texto = (await req.text()).trim();

      let rawBody: unknown = {};

      if (texto.length > 0) {
        try {
          rawBody = JSON.parse(texto);
        } catch {
          return {
            status: 400,

            jsonBody: {
              message: "Cuerpo JSON inválido",
            },
          };
        }
      }

      const parsed = procesarOutboxSchema.safeParse(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en procesarOutbox", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Parámetros de despacho inválidos", parsed.error);
      }

      const resultado = await esbService.procesarOutbox(parsed.data.limite);

      context.log("Despacho del outbox ejecutado", {
        oid: user?.oid,
        ...resultado,
      });

      return {
        status: 200,

        jsonBody: resultado,
      };
    } catch (error: any) {
      if (error instanceof EsbNoConfiguradoError) {
        context.error("ESB sin configuración", error);

        return {
          status: 500,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error despachando el outbox", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error despachando el outbox",
        },
      };
    }
  },
);

export const procesarOutbox = withCors(procesarOutboxHandler);

app.http("procesarOutbox", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "esb/outbox/procesar",

  handler: procesarOutbox,
});
