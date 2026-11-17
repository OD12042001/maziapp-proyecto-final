import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as trabajoDependienteService from "../../services/trabajosDependientes/trabajoDependiente.service";

/**
 * 📋 GET /api/contactos/{contactoId}/trabajos-dependientes -- Fase
 * Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones).
 *
 * Mismo patrón de seguridad que getDirecciones.ts:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...): mismo rol exigido que
 *     el resto del módulo Contactos, sin crear un rol nuevo.
 *   - withCors por fuera, sin tocar withAuth.ts/validateToken.ts.
 *   - Ownership resuelto en trabajoDependiente.service.ts,
 *     reutilizando obtenerContactoPorId de contacto.service.ts (misma
 *     comparación de ownership case-insensitive de la Fase 3.13).
 */
const getTrabajosDependientesHandler = withAuth(
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

      const trabajos = await trabajoDependienteService.listarTrabajosDependientes(
        contactoId,
        user,
      );

      // 🔐 Anti-enumeración (mismo criterio que getDirecciones.ts): el
      // mismo 404 tanto si el contacto no existe como si existe pero
      // no pertenece al usuario autenticado.
      if (trabajos === null) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: trabajos,
      };
    } catch (error: any) {
      context.error("Error obteniendo trabajos dependientes", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getTrabajosDependientes = withCors(getTrabajosDependientesHandler);

app.http("getTrabajosDependientes", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/trabajos-dependientes",

  handler: getTrabajosDependientes,
});
