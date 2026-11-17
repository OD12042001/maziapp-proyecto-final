import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { obtenerReporte } from "../../services/reportes/reporte.service";

// Nota: aquí no se restringe por rol en `withAuth` (se pasa `[]`) porque
// cada reporte tiene sus propios roles permitidos. La validación fina
// ocurre en `obtenerReporte`, que desde la migración de roles (fase 2,
// agosto 2026) consulta dbo.ReporteRoles en tiempo real (ver
// services/reportes/reporte.service.ts y
// repositories/reportes/reporteRol.repository.ts) — por eso ahora es
// una llamada asíncrona.
export const getReporteEmbed = withAuth(
  [],

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    const key = req.params.key;

    if (!key) {
      return { status: 400, jsonBody: { message: "Falta el parámetro 'key'" } };
    }

    const resultado = await obtenerReporte(key, user?.roles || []);

    if (!resultado.ok) {
      if (resultado.status === 404) {
        return { status: 404, jsonBody: { message: "Reporte no encontrado" } };
      }

      context.warn("Acceso denegado a reporte", { key, oid: user?.oid });

      return { status: 403, jsonBody: { message: "No tienes permisos para este reporte" } };
    }

    return { status: 200, jsonBody: { url: resultado.url } };
  },
);

app.http("getReporteEmbed", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "reportes/{key}",

  handler: getReporteEmbed,
});
