import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { COMISIONES_ROLES_REVERSION } from "../../config/roles";
import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import * as comisionesService from "../../services/comisiones/comisiones.service";
import {
  ComisionEstadoNoPermitidoError,
  ComisionNoConfiguradaError,
  ComisionPlazoReversionVencidoError,
} from "../../services/comisiones/comisiones.service";
import {
  ejecutarIdempotente,
  IdempotenciaClaveInvalidaError,
  IdempotenciaCuerpoDistintoError,
  IdempotenciaEnProcesoError,
  validarClave,
} from "../../services/idempotencia/idempotencia.service";
import { respuestaValidacion } from "../../utils/httpResponses";
import { revertirComisionSchema } from "../../validators/comisiones.validator";

/**
 * ↩️ POST /api/comisiones/{comisionId}/reversion — S17.
 *
 * Exige `Idempotency-Key`. Marca la comisión como `REVERTIDA` sin
 * eliminar el registro original, guarda el detalle en
 * `dbo.ComisionReversiones`, audita en S40 y publica
 * `ComisionRevertida` en el outbox.
 *
 *   400 — `Idempotency-Key` ausente/inválida o cuerpo inválido (Zod).
 *   404 — comisión no encontrada.
 *   409 — comisión ya revertida o liquidada, plazo vencido o solicitud
 *         en curso.
 *   422 — `Idempotency-Key` reutilizada con un cuerpo distinto.
 *   200 — comisión revertida.
 */
const revertirComisionHandler = withAuth(
  COMISIONES_ROLES_REVERSION,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      let claveIdempotencia: string;
      try {
        claveIdempotencia = validarClave(req.headers.get("idempotency-key"));
      } catch (error) {
        if (error instanceof IdempotenciaClaveInvalidaError) {
          return {
            status: 400,
            jsonBody: { message: error.message },
          };
        }
        throw error;
      }

      let rawBody: unknown;
      try {
        rawBody = await req.json();
      } catch {
        return {
          status: 400,
          jsonBody: { message: "Cuerpo JSON inválido" },
        };
      }

      const parsed = revertirComisionSchema.safeParse(rawBody);
      if (!parsed.success) {
        context.warn("Validación Zod fallida en revertirComision", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Datos de reversión inválidos", parsed.error);
      }

      const comisionIdParam = req.params.comisionId;

      const resultado = await ejecutarIdempotente(
        {
          clave: claveIdempotencia,
          endpoint: `POST /comisiones/${comisionIdParam}/reversion`,
          usuarioId: user.oid,
          cuerpo: rawBody,
        },
        async () => {
          const revertida = await comisionesService.revertir(
            comisionIdParam,
            parsed.data,
            user,
          );

          if (!revertida) {
            return {
              status: 404,
              body: { message: "Comisión no encontrada" },
            };
          }

          return {
            status: 200,
            body: revertida,
          };
        },
      );

      return {
        status: resultado.status,
        jsonBody: resultado.body,
      };
    } catch (error: any) {
      if (error instanceof IdempotenciaCuerpoDistintoError) {
        return {
          status: 422,
          jsonBody: { message: error.message },
        };
      }

      if (
        error instanceof IdempotenciaEnProcesoError ||
        error instanceof ComisionEstadoNoPermitidoError ||
        error instanceof ComisionPlazoReversionVencidoError
      ) {
        context.warn("Reversión de comisión rechazada", {
          oid: user?.oid,
          motivo: error.name,
        });

        return {
          status: 409,
          jsonBody: { message: error.message },
        };
      }

      if (error instanceof ComisionNoConfiguradaError) {
        context.error("Parámetro de comisión no configurado", error);

        return {
          status: 500,
          jsonBody: { message: error.message },
        };
      }

      context.error("Error revirtiendo la comisión", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error revirtiendo la comisión",
        },
      };
    }
  },
);

export const revertirComision = withCors(revertirComisionHandler);

app.http("revertirComision", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "comisiones/{comisionId:int}/reversion",
  handler: revertirComision,
});
