import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { CIERRES_ROLES_ESCRITURA } from "../../config/roles";
import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import * as cierresService from "../../services/cierres/cierres.service";
import {
  CierreDuplicadoError,
  CierreKycNoValidadoError,
  CierreMonedaInvalidaError,
  CierreOportunidadNoValidaError,
  CierreProyectoInvalidoError,
} from "../../services/cierres/cierres.service";
import {
  ejecutarIdempotente,
  IdempotenciaClaveInvalidaError,
  IdempotenciaCuerpoDistintoError,
  IdempotenciaEnProcesoError,
  validarClave,
} from "../../services/idempotencia/idempotencia.service";
import { respuestaValidacion } from "../../utils/httpResponses";
import { registrarCierreSchema } from "../../validators/cierres.validator";

/**
 * ✍️ POST /api/cierres — S15.
 *
 * Exige `Idempotency-Key`. El cierre, la auditoría (S40) y el evento
 * `CierreGanadoRegistrado` (outbox ESB) se confirman en una sola
 * transacción.
 *
 *   400 — `Idempotency-Key` ausente/inválida o cuerpo inválido (Zod).
 *   404 — la oportunidad no existe o no es de la cartera del usuario.
 *   409 — KYC no validado, oportunidad perdida, proyecto/moneda inactivo,
 *         cierre ya existente o solicitud con la misma clave en curso.
 *   422 — `Idempotency-Key` reutilizada con un cuerpo distinto.
 *   201 — cierre registrado (o repetición idempotente con el mismo cuerpo).
 */
const createCierreHandler = withAuth(
  CIERRES_ROLES_ESCRITURA,

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

      const parsed = registrarCierreSchema.safeParse(rawBody);
      if (!parsed.success) {
        context.warn("Validación Zod fallida en createCierre", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Datos de cierre inválidos", parsed.error);
      }

      const resultado = await ejecutarIdempotente(
        {
          clave: claveIdempotencia,
          endpoint: "POST /cierres",
          usuarioId: user.oid,
          cuerpo: rawBody,
        },
        async () => {
          const creado = await cierresService.registrarCierre(
            parsed.data,
            user,
          );

          if (!creado) {
            return {
              status: 404,
              body: { message: "Oportunidad no encontrada" },
            };
          }

          return {
            status: 201,
            body: creado,
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
        error instanceof CierreDuplicadoError ||
        error instanceof CierreOportunidadNoValidaError ||
        error instanceof CierreKycNoValidadoError ||
        error instanceof CierreProyectoInvalidoError ||
        error instanceof CierreMonedaInvalidaError
      ) {
        context.warn("Registro de cierre rechazado", {
          oid: user?.oid,
          motivo: error.name,
        });

        return {
          status: 409,
          jsonBody: { message: error.message },
        };
      }

      context.error("Error registrando el cierre", error);

      return {
        status: 500,
        jsonBody: {
          message: "Error registrando el cierre de inversión",
        },
      };
    }
  },
);

export const createCierre = withCors(createCierreHandler);

app.http("createCierre", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "cierres",
  handler: createCierre,
});
