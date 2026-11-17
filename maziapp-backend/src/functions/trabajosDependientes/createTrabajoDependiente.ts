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
import {
  TrabajoDependienteEmpresaInvalidaError,
  TrabajoDependienteTipoIncorrectoError,
} from "../../services/trabajosDependientes/trabajoDependiente.service";
import { validateTrabajoDependiente } from "../../validators/trabajoDependiente.validator";

/**
 * ➕ POST /api/contactos/{contactoId}/trabajos-dependientes -- Fase
 * Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones).
 *
 * Flujo (validado primero por Zod `.strict()`, luego resuelto por
 * trabajoDependiente.service.ts::crearTrabajoDependiente -- mismo
 * criterio que createDireccion.ts):
 *   - 400 si falta el id del contacto en la ruta.
 *   - 400 si el payload no pasa Zod (`.strict()` rechaza cualquier
 *     campo técnico: id, activo, fechaModificacion, etc.).
 *   - 404 si el contacto no existe o no es del usuario autenticado
 *     (anti-enumeración, igual que createDireccion.ts).
 *   - 400 si el contacto no es de tipo NATURAL
 *     (TrabajoDependienteTipoIncorrectoError).
 *   - 400 si `empresaContactoId` no corresponde a una empresa válida y
 *     accesible (TrabajoDependienteEmpresaInvalidaError).
 *   - 201 en éxito, con el trabajo dependiente creado (Empresa ya
 *     resuelta por JOIN, nunca reconstruida en el Frontend).
 */
const createTrabajoDependienteHandler = withAuth(
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

      const rawBody = await req.json();

      const parsed = validateTrabajoDependiente(rawBody);

      if (!parsed.success) {
        // 🔎 Mismo criterio de diagnóstico seguro que createDireccion.ts:
        // solo `path`/`code` de cada issue de Zod, nunca `message`/
        // `received`/`expected`.
        context.warn("Validación Zod fallida en createTrabajoDependiente", {
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

      const creado = await trabajoDependienteService.crearTrabajoDependiente(
        contactoId,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración: el mismo 404 tanto si el contacto no
      // existe como si existe pero no pertenece al usuario autenticado.
      if (!creado) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      context.log("Trabajo dependiente creado", {
        oid: user?.oid,
        contactoId,
        idTrabajo: creado.id,
      });

      return {
        status: 201,

        jsonBody: creado,
      };
    } catch (error: any) {
      if (error instanceof TrabajoDependienteTipoIncorrectoError) {
        context.warn("Alta de trabajo dependiente rechazada: tipo de contacto incorrecto", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      if (error instanceof TrabajoDependienteEmpresaInvalidaError) {
        context.warn("Alta de trabajo dependiente rechazada: empresa inválida", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que createDireccion.ts): no devolver
      // error.message al cliente; se loggea el detalle server-side.
      context.error("Error creando trabajo dependiente", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando trabajo dependiente",
        },
      };
    }
  },
);

export const createTrabajoDependiente = withCors(createTrabajoDependienteHandler);

app.http("createTrabajoDependiente", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/trabajos-dependientes",

  handler: createTrabajoDependiente,
});
