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
import { DireccionDistritoInvalidoError } from "../../services/direcciones/direccion.service";
import { validateDireccionUpdate } from "../../validators/direccion.validator";

/**
 * ✏️ PATCH /api/contactos/{contactoId}/direcciones/{direccionId} --
 * Fase Direcciones.
 *
 * Endpoint NUEVO, independiente de createDireccion.ts (no se reutiliza
 * para actualizar, mismo criterio que updateContacto.ts frente a
 * createContacto.ts). Mismo patrón de seguridad que el resto del
 * módulo:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...).
 *   - withCors por fuera.
 *   - Zod `.strict()` (validateDireccionUpdate) rechaza cualquier
 *     campo técnico/de identificación con 400, antes de tocar BD.
 *   - Ownership del Contacto Y pertenencia de la Dirección a ese
 *     Contacto se verifican en direccion.service.ts/
 *     direccion.repository.ts (WHERE ... AND IdContacto = @idContacto),
 *     nunca a partir de ningún valor del body.
 */
const updateDireccionHandler = withAuth(
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

      const rawBody = await req.json();

      const parsed = validateDireccionUpdate(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en updateDireccion", {
          oid: user?.oid,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path,
            code: issue.code,
          })),
        });

        const flattened = parsed.error.flatten();

        return {
          status: 400,

          jsonBody: {
            message: "Datos de dirección inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const actualizada = await direccionService.actualizarDireccion(
        contactoId,
        direccionId,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración: el mismo 404 tanto si el contacto no
      // existe/no es del usuario, como si la dirección nunca existió,
      // no es de este contacto, o ya estaba desactivada -- nunca se
      // distingue con un 403.
      if (!actualizada) {
        return {
          status: 404,

          jsonBody: {
            message: "Dirección no encontrada",
          },
        };
      }

      context.log("Dirección actualizada", {
        oid: user?.oid,
        contactoId,
        idDireccion: actualizada.idDireccion,
      });

      return {
        status: 200,

        jsonBody: actualizada,
      };
    } catch (error: any) {
      if (error instanceof DireccionDistritoInvalidoError) {
        context.warn("Actualización de dirección rechazada: distrito inválido", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error actualizando dirección", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error actualizando dirección",
        },
      };
    }
  },
);

export const updateDireccion = withCors(updateDireccionHandler);

app.http("updateDireccion", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/direcciones/{direccionId}",

  handler: updateDireccion,
});
