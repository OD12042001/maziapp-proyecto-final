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
 * ➖ DELETE /api/contactos/{contactoId}/representantes/{representanteId}
 * -- Fase Representantes.
 *
 * Desactiva (soft delete, Activo = 0) la relación entre la empresa y
 * el representante -- nunca borra físicamente la fila de
 * dbo.ContactoRepresentante ni el registro de dbo.Representantes
 * (decisión 4: un representante desactivado debe poder reactivarse
 * después mediante un nuevo POST, que reutiliza la misma relación en
 * vez de crear una segunda fila -- ver representante.service.ts).
 *
 * Mismo patrón de seguridad que el resto del módulo: withAuth con
 * CONTACTOS_ROLES_PERMITIDOS + withCors por fuera; ownership y
 * JURIDICA verificados en representante.service.ts antes de tocar la
 * base de datos.
 */
const deactivateRepresentanteHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const contactoId = req.params.contactoId;
      const representanteId = req.params.representanteId;

      if (!contactoId || !representanteId) {
        return {
          status: 400,

          jsonBody: {
            message: "Falta el id del contacto o del representante en la ruta",
          },
        };
      }

      const resultado = await representanteService.desactivarRepresentante(
        contactoId,
        representanteId,
        user,
      );

      // 🔐 Mismo criterio anti-enumeración que el resto del módulo: un
      // 404 tanto si el contacto no existe/no es del usuario, como si
      // la relación con ese representante nunca existió o ya estaba
      // desactivada -- nunca se distingue con un 403 ni con mensajes
      // diferentes.
      if (!resultado) {
        return {
          status: 404,

          jsonBody: {
            message: "Relación con el representante no encontrada",
          },
        };
      }

      context.log("Representante desactivado", {
        oid: user?.oid,
        contactoId,
        representanteId,
      });

      return {
        status: 204,
      };
    } catch (error: any) {
      if (error instanceof RepresentanteContactoNoJuridicaError) {
        context.warn("Baja de representante rechazada: contacto no es JURIDICA", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error desactivando representante", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error desactivando representante",
        },
      };
    }
  },
);

export const deactivateRepresentante = withCors(deactivateRepresentanteHandler);

app.http("deactivateRepresentante", {
  methods: ["DELETE"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/representantes/{representanteId}",

  handler: deactivateRepresentante,
});
