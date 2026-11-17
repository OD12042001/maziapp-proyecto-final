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
import {
  RepresentanteContactoNoJuridicaError,
  RepresentanteRelacionDuplicadaError,
} from "../../services/representantes/representante.service";
import { validateRepresentanteCreate } from "../../validators/representante.validator";

// Números de error nativos de SQL Server para violación de restricción
// UNIQUE (mismo criterio que createContacto.ts). Aplica como red de
// seguridad ante una carrera de inserts concurrentes sobre
// UQ_Representantes_TipoDocumento_NumeroDocumento -- el camino normal
// (sin carrera) ya evita este conflicto buscando primero por
// documento en representante.service.ts::crearRepresentante.
const SQL_UNIQUE_VIOLATION_CODES = new Set([2601, 2627]);

/**
 * ➕ POST /api/contactos/{contactoId}/representantes -- Fase
 * Representantes.
 *
 * Flujo (validado primero por Zod `.strict()`, luego resuelto por
 * representante.service.ts::crearRepresentante -- ver ese archivo para
 * el detalle de "buscar y reutilizar" vs. "crear nuevo" y "crear
 * relación" vs. "reactivar"):
 *   - 400 si falta el id del contacto en la ruta.
 *   - 400 si el payload no pasa Zod (`.strict()` rechaza cualquier
 *     campo técnico: representanteId, contactoId, activo, etc.).
 *   - 404 si el contacto no existe o no es del usuario autenticado
 *     (anti-enumeración, igual que createContacto.ts/getContactos.ts).
 *   - 400 si el contacto es NATURAL (no admite representantes).
 *   - 409 si ya existe una relación ACTIVA entre esta empresa y este
 *     representante, o (red de seguridad) si SQL Server rechaza por
 *     UNIQUE de documento.
 *   - 201 en éxito, con el representante creado o reutilizado.
 */
const createRepresentanteHandler = withAuth(
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

      // 🔐 Igual que createContacto.ts: `.strict()` rechaza cualquier
      // propiedad no prevista con 400, sin llegar al Service.
      const parsed = validateRepresentanteCreate(rawBody);

      if (!parsed.success) {
        // 🔎 Mismo criterio de diagnóstico seguro que createContacto.ts:
        // solo `path`/`code` de cada issue de Zod, nunca `message`/
        // `received`/`expected` (podrían contener un valor real
        // enviado por el cliente).
        context.warn("Validación Zod fallida en createRepresentante", {
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

      const creado = await representanteService.crearRepresentante(
        contactoId,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración (mismo criterio que createContacto.ts): el
      // mismo 404 tanto si el contacto no existe como si existe pero no
      // pertenece al usuario autenticado.
      if (!creado) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      // 🔐 Log sin PII completa (mismo criterio que createContacto.ts):
      // solo oid del actor, id del contacto y de la relación creada --
      // nunca documento/nombres/apellidos/celular/correo.
      context.log("Representante asociado a contacto", {
        oid: user?.oid,
        contactoId,
        contactoRepresentanteId: creado.contactoRepresentanteId,
      });

      return {
        status: 201,

        jsonBody: creado,
      };
    } catch (error: any) {
      if (error instanceof RepresentanteContactoNoJuridicaError) {
        context.warn("Alta de representante rechazada: contacto no es JURIDICA", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      if (error instanceof RepresentanteRelacionDuplicadaError) {
        context.warn("Alta de representante rechazada: relación ya activa", {
          oid: user?.oid,
        });

        return {
          status: 409,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 Conflicto de unicidad de documento (red de seguridad ante
      // carrera de inserts concurrentes -- ver comentario junto a
      // SQL_UNIQUE_VIOLATION_CODES arriba).
      if (error?.number && SQL_UNIQUE_VIOLATION_CODES.has(error.number)) {
        context.warn("Conflicto de unicidad al crear representante", {
          oid: user?.oid,
        });

        return {
          status: 409,

          jsonBody: {
            message:
              "Ya existe un representante registrado con ese tipo y número de documento.",
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que createContacto.ts): no devolver
      // error.message al cliente; se loggea el detalle server-side.
      context.error("Error creando representante", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando representante",
        },
      };
    }
  },
);

export const createRepresentante = withCors(createRepresentanteHandler);

app.http("createRepresentante", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/representantes",

  handler: createRepresentante,
});
