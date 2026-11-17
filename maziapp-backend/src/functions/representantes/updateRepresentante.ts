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
import { validateRepresentanteUpdate } from "../../validators/representante.validator";

/**
 * ✏️ PATCH /api/contactos/{contactoId}/representantes/{representanteId}
 * -- Fase Representantes (Edición).
 *
 * Endpoint NUEVO, independiente de createRepresentante.ts (no se
 * reutiliza el alta para actualizar -- mismo criterio que
 * updateDireccion.ts frente a createDireccion.ts / updateContacto.ts
 * frente a createContacto.ts). Mismo patrón de seguridad que el resto
 * del módulo:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...).
 *   - withCors por fuera (usa el mismo preflight ya registrado en
 *     representantesCorsPreflight.ts para la ruta
 *     `contactos/{contactoId}/representantes/{representanteId?}` --
 *     no se crea un preflight nuevo).
 *   - Zod `.strict()` (validateRepresentanteUpdate) rechaza cualquier
 *     campo técnico/de identificación (tipoDocumento, numeroDocumento,
 *     representanteId, contactoRepresentanteId, activo, etc.) con 400,
 *     antes de tocar BD.
 *   - Ownership del Contacto, tipo JURIDICA, Y pertenencia de la
 *     relación Contacto-Representante se verifican en
 *     representante.service.ts::actualizarRepresentante (nunca a
 *     partir de ningún valor del body).
 *
 * 🔐 CRÍTICO (mismo criterio documentado en representante.service.ts):
 * un representante puede pertenecer a varias empresas -- este endpoint
 * NUNCA asume lo contrario. El 404 anti-enumeración cubre tanto
 * "contacto no existe/no es tuyo" como "esta empresa no tiene a este
 * representante asociado (activo)", sin distinguir el motivo.
 */
const updateRepresentanteHandler = withAuth(
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

      const rawBody = await req.json();

      const parsed = validateRepresentanteUpdate(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en updateRepresentante", {
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
            message: "Datos de representante inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const actualizado = await representanteService.actualizarRepresentante(
        contactoId,
        representanteId,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración (mismo criterio que updateDireccion.ts): el
      // mismo 404 tanto si el contacto no existe/no es del usuario,
      // como si la relación con ese representante nunca existió o ya
      // estaba desactivada -- nunca se distingue con un 403.
      if (!actualizado) {
        return {
          status: 404,

          jsonBody: {
            message: "Representante no encontrado",
          },
        };
      }

      // 🔐 Log sin PII completa (mismo criterio que
      // createRepresentante.ts): solo oid del actor, id del contacto y
      // de la relación actualizada -- nunca documento/nombres/
      // apellidos/celular/correo.
      context.log("Representante actualizado", {
        oid: user?.oid,
        contactoId,
        contactoRepresentanteId: actualizado.contactoRepresentanteId,
      });

      return {
        status: 200,

        jsonBody: actualizado,
      };
    } catch (error: any) {
      if (error instanceof RepresentanteContactoNoJuridicaError) {
        context.warn("Edición de representante rechazada: contacto no es JURIDICA", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que el resto del módulo): no devolver
      // error.message al cliente; se loggea el detalle server-side.
      context.error("Error actualizando representante", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error actualizando representante",
        },
      };
    }
  },
);

export const updateRepresentante = withCors(updateRepresentanteHandler);

app.http("updateRepresentante", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/representantes/{representanteId}",

  handler: updateRepresentante,
});
