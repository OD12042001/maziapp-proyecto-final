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
 * ➖ DELETE /api/contactos/{contactoId}/trabajos-dependientes/{trabajoId}
 * -- Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones).
 *
 * Desactiva (soft delete, Activo = 0) el Trabajo dependiente -- nunca
 * borra físicamente la fila (decisión de esta fase, igual que
 * dbo.Direcciones). Mismo patrón de seguridad que
 * deactivateDireccion.ts: withAuth con CONTACTOS_ROLES_PERMITIDOS +
 * withCors por fuera; ownership y pertenencia del Trabajo al Contacto
 * verificados en trabajoDependiente.service.ts antes de tocar la base
 * de datos.
 */
const deactivateTrabajoDependienteHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const contactoId = req.params.contactoId;
      const trabajoId = req.params.trabajoId;

      if (!contactoId || !trabajoId) {
        return {
          status: 400,

          jsonBody: {
            message: "Falta el id del contacto o del trabajo dependiente en la ruta",
          },
        };
      }

      const resultado = await trabajoDependienteService.desactivarTrabajoDependiente(
        contactoId,
        trabajoId,
        user,
      );

      // 🔐 Mismo criterio anti-enumeración que el resto del módulo: un
      // 404 tanto si el contacto no existe/no es del usuario, como si
      // el trabajo dependiente nunca existió o ya estaba desactivado
      // -- nunca se distingue con un 403 ni con mensajes diferentes.
      if (!resultado) {
        return {
          status: 404,

          jsonBody: {
            message: "Trabajo dependiente no encontrado",
          },
        };
      }

      context.log("Trabajo dependiente desactivado", {
        oid: user?.oid,
        contactoId,
        trabajoId,
      });

      return {
        status: 204,
      };
    } catch (error: any) {
      context.error("Error desactivando trabajo dependiente", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error desactivando trabajo dependiente",
        },
      };
    }
  },
);

export const deactivateTrabajoDependiente = withCors(deactivateTrabajoDependienteHandler);

app.http("deactivateTrabajoDependiente", {
  methods: ["DELETE"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/trabajos-dependientes/{trabajoId}",

  handler: deactivateTrabajoDependiente,
});
