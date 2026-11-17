import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as representanteService from "../../services/representantes/representante.service";
import { RepresentanteContactoNoJuridicaError } from "../../services/representantes/representante.service";

/**
 * 📋 GET /api/contactos/{contactoId}/representantes -- Fase
 * Representantes.
 *
 * Mismo patrón de seguridad que getContactos.ts:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...): mismo rol exigido que
 *     el resto del módulo Contactos, sin crear un rol nuevo.
 *   - withCors por fuera, sin tocar withAuth.ts/validateToken.ts.
 *   - La verificación de "existe + es del usuario + es JURIDICA" ocurre
 *     en representante.service.ts, reutilizando obtenerContactoPorId de
 *     contacto.service.ts (misma comparación de ownership
 *     case-insensitive de la Fase 3.13). Nunca se confía en que el
 *     Frontend ya ocultó la pestaña Representantes para NATURAL.
 */
const getRepresentantesHandler = withAuth(
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

      const representantes = await representanteService.listarRepresentantes(
        contactoId,
        user,
      );

      // 🔐 Anti-enumeración (mismo criterio que getContactos.ts): el
      // mismo 404 tanto si el contacto no existe como si existe pero no
      // pertenece al usuario autenticado.
      if (representantes === null) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: representantes,
      };
    } catch (error: any) {
      if (error instanceof RepresentanteContactoNoJuridicaError) {
        context.warn("Consulta de representantes rechazada: contacto no es JURIDICA", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error obteniendo representantes", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getRepresentantes = withCors(getRepresentantesHandler);

app.http("getRepresentantes", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/representantes",

  handler: getRepresentantes,
});
