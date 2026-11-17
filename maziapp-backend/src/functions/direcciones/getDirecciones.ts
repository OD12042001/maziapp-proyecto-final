import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as direccionService from "../../services/direcciones/direccion.service";

/**
 * 📋 GET /api/contactos/{contactoId}/direcciones -- Fase Direcciones.
 *
 * Mismo patrón de seguridad que getRepresentantes.ts:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...): mismo rol exigido que
 *     el resto del módulo Contactos, sin crear un rol nuevo.
 *   - withCors por fuera, sin tocar withAuth.ts/validateToken.ts.
 *   - Ownership resuelto en direccion.service.ts, reutilizando
 *     obtenerContactoPorId de contacto.service.ts (misma comparación
 *     de ownership case-insensitive de la Fase 3.13) -- aplica tanto a
 *     contactos NATURAL como JURIDICA, a diferencia de Representantes.
 */
const getDireccionesHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const contactoId = req.params.contactoId;

      if (!contactoId) {
        return {
          status: 400,

          jsonBody: {
            message: "Falta el id del contacto en la ruta",
          },
        };
      }

      const direcciones = await direccionService.listarDirecciones(contactoId, user);

      // 🔐 Anti-enumeración (mismo criterio que getRepresentantes.ts):
      // el mismo 404 tanto si el contacto no existe como si existe
      // pero no pertenece al usuario autenticado.
      if (direcciones === null) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: direcciones,
      };
    } catch (error: any) {
      context.error("Error obteniendo direcciones", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getDirecciones = withCors(getDireccionesHandler);

app.http("getDirecciones", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/direcciones",

  handler: getDirecciones,
});
