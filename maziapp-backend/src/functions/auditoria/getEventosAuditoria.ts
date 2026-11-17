import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { AUDITORIA_ROLES_LECTURA } from "../../config/roles";
import { respuestaValidacion } from "../../utils/httpResponses";
import { listarAuditoriaQuerySchema } from "../../validators/auditoria.validator";

import * as auditoriaService from "../../services/auditoria/auditoria.service";

/**
 * 📋 GET /api/auditoria/eventos — S40.
 *
 * Consulta paginada de la bitácora de solo anexado, de la más reciente
 * a la más antigua. Es el único acceso HTTP a la bitácora: no existe
 * endpoint que la escriba ni la modifique.
 *
 * Solo se leen los parámetros declarados en el contrato; cualquier otro
 * query string se ignora.
 */
const getEventosAuditoriaHandler = withAuth(
  AUDITORIA_ROLES_LECTURA,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const parsed = listarAuditoriaQuerySchema.safeParse({
        servicioCodigo: req.query.get("servicioCodigo") ?? undefined,
        entidad: req.query.get("entidad") ?? undefined,
        entidadId: req.query.get("entidadId") ?? undefined,
        correlationId: req.query.get("correlationId") ?? undefined,
        usuarioId: req.query.get("usuarioId") ?? undefined,
        resultado: req.query.get("resultado") ?? undefined,
        desde: req.query.get("desde") ?? undefined,
        hasta: req.query.get("hasta") ?? undefined,
        page: req.query.get("page") ?? undefined,
        pageSize: req.query.get("pageSize") ?? undefined,
      });

      if (!parsed.success) {
        context.warn("Validación Zod fallida en getEventosAuditoria", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        return respuestaValidacion("Filtros de auditoría inválidos", parsed.error);
      }

      const resultado = await auditoriaService.listarEventos(parsed.data);

      return {
        status: 200,

        jsonBody: resultado,
      };
    } catch (error) {
      context.error("Error consultando la auditoría", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error consultando la auditoría",
        },
      };
    }
  },
);

export const getEventosAuditoria = withCors(getEventosAuditoriaHandler);

app.http("getEventosAuditoria", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "auditoria/eventos",

  handler: getEventosAuditoria,
});
