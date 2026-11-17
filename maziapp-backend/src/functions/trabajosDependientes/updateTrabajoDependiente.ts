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
import { TrabajoDependienteEmpresaInvalidaError } from "../../services/trabajosDependientes/trabajoDependiente.service";
import { validateTrabajoDependienteUpdate } from "../../validators/trabajoDependiente.validator";

/**
 * ✏️ PATCH /api/contactos/{contactoId}/trabajos-dependientes/{trabajoId}
 * -- Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones).
 *
 * Endpoint NUEVO, independiente de createTrabajoDependiente.ts (no se
 * reutiliza para actualizar, mismo criterio que updateDireccion.ts
 * frente a createDireccion.ts). Mismo patrón de seguridad que el resto
 * del módulo:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...).
 *   - withCors por fuera.
 *   - Zod `.strict()` (validateTrabajoDependienteUpdate) rechaza
 *     cualquier campo técnico/de identificación con 400, antes de
 *     tocar BD.
 *   - Ownership del Contacto Y pertenencia del Trabajo a ese Contacto
 *     se verifican en trabajoDependiente.service.ts/
 *     trabajoDependiente.repository.ts (WHERE ... AND ContactoId =
 *     @contactoId), nunca a partir de ningún valor del body.
 *
 * No se maneja aquí TrabajoDependienteTipoIncorrectoError: esa
 * verificación es exclusiva del alta (crearTrabajoDependiente) -- una
 * fila existente ya fue creada, en su momento, para un contacto
 * NATURAL; el scoping por ContactoId + Activo = 1 ya es suficiente
 * para no editar jamás la fila de otro contacto.
 */
const updateTrabajoDependienteHandler = withAuth(
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

      const rawBody = await req.json();

      const parsed = validateTrabajoDependienteUpdate(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en updateTrabajoDependiente", {
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
            message: "Datos de trabajo dependiente inválidos",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const actualizado = await trabajoDependienteService.actualizarTrabajoDependiente(
        contactoId,
        trabajoId,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración: el mismo 404 tanto si el contacto no
      // existe/no es del usuario, como si el trabajo dependiente nunca
      // existió, no es de este contacto, o ya estaba desactivado --
      // nunca se distingue con un 403.
      if (!actualizado) {
        return {
          status: 404,

          jsonBody: {
            message: "Trabajo dependiente no encontrado",
          },
        };
      }

      context.log("Trabajo dependiente actualizado", {
        oid: user?.oid,
        contactoId,
        idTrabajo: actualizado.id,
      });

      return {
        status: 200,

        jsonBody: actualizado,
      };
    } catch (error: any) {
      if (error instanceof TrabajoDependienteEmpresaInvalidaError) {
        context.warn("Actualización de trabajo dependiente rechazada: empresa inválida", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      context.error("Error actualizando trabajo dependiente", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error actualizando trabajo dependiente",
        },
      };
    }
  },
);

export const updateTrabajoDependiente = withCors(updateTrabajoDependienteHandler);

app.http("updateTrabajoDependiente", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/trabajos-dependientes/{trabajoId}",

  handler: updateTrabajoDependiente,
});
