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
 * ➖ DELETE /api/contactos/{contactoId}/direcciones/{direccionId} --
 * Fase Direcciones.
 *
 * Desactiva (soft delete, Activo = 0) la Dirección -- nunca borra
 * físicamente la fila (decisión de esta fase, igual que
 * dbo.ContactoRepresentante en Representantes). Mismo patrón de
 * seguridad que deactivateRepresentante.ts: withAuth con
 * CONTACTOS_ROLES_PERMITIDOS + withCors por fuera; ownership y
 * pertenencia de la Dirección al Contacto verificados en
 * direccion.service.ts antes de tocar la base de datos.
 */
const deactivateDireccionHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const contactoId = req.params.contactoId;
      const direccionId = req.params.direccionId;

      if (!contactoId || !direccionId) {
        return {
          status: 400,

          jsonBody: {
            message: "Falta el id del contacto o de la dirección en la ruta",
          },
        };
      }

      const resultado = await direccionService.desactivarDireccion(
        contactoId,
        direccionId,
        user,
      );

      // 🔐 Mismo criterio anti-enumeración que el resto del módulo: un
      // 404 tanto si el contacto no existe/no es del usuario, como si
      // la dirección nunca existió o ya estaba desactivada -- nunca
      // se distingue con un 403 ni con mensajes diferentes.
      if (!resultado) {
        return {
          status: 404,

          jsonBody: {
            message: "Dirección no encontrada",
          },
        };
      }

      context.log("Dirección desactivada", {
        oid: user?.oid,
        contactoId,
        direccionId,
      });

      return {
        status: 204,
      };
    } catch (error: any) {
      context.error("Error desactivando dirección", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error desactivando dirección",
        },
      };
    }
  },
);

export const deactivateDireccion = withCors(deactivateDireccionHandler);

app.http("deactivateDireccion", {
  methods: ["DELETE"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/direcciones/{direccionId}",

  handler: deactivateDireccion,
});
