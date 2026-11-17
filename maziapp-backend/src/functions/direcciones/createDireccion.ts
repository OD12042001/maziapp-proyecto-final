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
import { validateDireccionCreate } from "../../validators/direccion.validator";

/**
 * ➕ POST /api/contactos/{contactoId}/direcciones -- Fase Direcciones.
 *
 * Flujo (validado primero por Zod `.strict()`, luego resuelto por
 * direccion.service.ts::crearDireccion -- mismo criterio que
 * createRepresentante.ts):
 *   - 400 si falta el id del contacto en la ruta.
 *   - 400 si el payload no pasa Zod (`.strict()` rechaza cualquier
 *     campo técnico: idDireccion, idContacto, activo, etc.).
 *   - 404 si el contacto no existe o no es del usuario autenticado
 *     (anti-enumeración, igual que createContacto.ts/
 *     createRepresentante.ts).
 *   - 400 si el idDistrito no existe/no está activo
 *     (DireccionDistritoInvalidoError).
 *   - 201 en éxito, con la dirección creada (Distrito/Provincia/
 *     Departamento ya resueltos por JOIN, nunca reconstruidos en el
 *     Frontend).
 */
const createDireccionHandler = withAuth(
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

      const parsed = validateDireccionCreate(rawBody);

      if (!parsed.success) {
        // 🔎 Mismo criterio de diagnóstico seguro que createRepresentante.ts:
        // solo `path`/`code` de cada issue de Zod, nunca `message`/
        // `received`/`expected`.
        context.warn("Validación Zod fallida en createDireccion", {
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

      const creada = await direccionService.crearDireccion(contactoId, parsed.data, user);

      // 🔐 Anti-enumeración: el mismo 404 tanto si el contacto no
      // existe como si existe pero no pertenece al usuario autenticado.
      if (!creada) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      context.log("Dirección creada", {
        oid: user?.oid,
        contactoId,
        idDireccion: creada.idDireccion,
      });

      return {
        status: 201,

        jsonBody: creada,
      };
    } catch (error: any) {
      if (error instanceof DireccionDistritoInvalidoError) {
        context.warn("Alta de dirección rechazada: distrito inválido", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que createContacto.ts): no devolver
      // error.message al cliente; se loggea el detalle server-side.
      context.error("Error creando dirección", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando dirección",
        },
      };
    }
  },
);

export const createDireccion = withCors(createDireccionHandler);

app.http("createDireccion", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/direcciones",

  handler: createDireccion,
});
