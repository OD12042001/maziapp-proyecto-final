import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as contactoService from "../../services/contactos/contacto.service";
import { ContactoValidationError } from "../../services/contactos/contacto.service";
import { validateContactoUpdate } from "../../validators/contactoUpdate.validator";
// Nota: `ContactoValidationError` se importa también de forma nombrada
// (además de `contactoService.*`) únicamente para poder usar
// `instanceof` de forma directa y legible más abajo — no hay
// duplicación funcional, ambas referencias apuntan a la misma clase.

// ✏️ PATCH /api/contactos/{id} — Fase 3.15 / 7A (Cliente + Ubicación)
//
// Endpoint NUEVO, independiente de createContacto.ts (no se reutiliza
// para actualizar, tal como se pidió explícitamente). Mismo patrón de
// seguridad que createContacto.ts/getContactos.ts:
//   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...): mismo rol exigido que
//     para crear/listar/consultar Contactos, sin tocar withAuth.ts ni
//     los roles permitidos.
//   - withCors por fuera, sin registrar CORS aparte: corsPreflight.ts
//     ya cubre OPTIONS para route "contactos/{id:int?}" para cualquier
//     método (incluye "contactos/empresas"? NO: esa ruta literal
//     tiene su propio preflight dedicado, empresasCorsPreflight.ts,
//     precisamente porque "empresas" ya no matchea {id:int?}).
//   - Zod `.strict()` (validateContactoUpdate) rechaza cualquier
//     campo técnico/identificación que el cliente intente enviar
//     (id, responsableId, tipoContacto, tipoDocumento,
//     numeroDocumento, creadoId, etc.) con 400, antes de tocar BD.
//   - La verificación de ownership (¿existe?, ¿es del usuario
//     autenticado?) ocurre en el Service, reutilizando
//     obtenerContactoPorId — la MISMA comparación de GUID
//     case-insensitive de la Fase 3.13. Nunca se confía en el
//     Frontend para autorización: el `id` de la URL se resuelve
//     siempre contra `user.oid` del token ya validado por withAuth,
//     nunca contra ningún valor que venga en el body.
const updateContactoHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id;

      if (!id) {
        return {
          status: 400,

          jsonBody: {
            message: "Falta el id del contacto en la ruta",
          },
        };
      }

      const rawBody = await req.json();

      // 🔐 Igual que createContacto.ts: `.strict()` en el schema
      // rechaza cualquier propiedad no prevista (incluyendo campos de
      // identificación/auditoría) con 400, sin llegar al Service.
      const parsed = validateContactoUpdate(rawBody);

      if (!parsed.success) {
        // 🔎 Mismo criterio de diagnóstico seguro que createContacto.ts:
        // solo `path` (qué campo) y `code` (qué tipo de problema) de
        // cada issue de Zod — nunca `message`/`received`/`expected`,
        // que podrían contener un valor real enviado por el cliente.
        context.warn("Validación Zod fallida en updateContacto", {
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
            message: "Datos de actualización inválidos",
            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const actualizado = await contactoService.actualizarContacto(
        id,
        parsed.data,
        user,
      );

      // 🔐 Anti-enumeración (mismo criterio que getContactos.ts): el
      // mismo 404 "Contacto no encontrado" tanto si el id no existe
      // como si existe pero no pertenece al usuario autenticado —
      // nunca se distingue con un 403.
      if (!actualizado) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      // 🔐 Log sin PII (mismo criterio que createContacto.ts): solo
      // oid del actor y id del contacto actualizado, nunca los
      // valores de los campos modificados.
      context.log("Contacto actualizado", {
        oid: user?.oid,
        contactoId: actualizado.id,
      });

      return {
        status: 200,

        jsonBody: actualizado,
      };
    } catch (error: any) {
      // 🔐 Error de negocio (coherencia NATURAL/JURIDICA contra la
      // fila existente) -> 400 con mensaje seguro, sin exponer
      // detalles internos ni el valor enviado.
      if (error instanceof ContactoValidationError) {
        context.warn("Actualización de contacto rechazada por coherencia de tipo", {
          oid: user?.oid,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que createContacto.ts/getContactos.ts):
      // no devolver error.message al cliente; se loggea el detalle
      // server-side únicamente.
      context.error("Error actualizando contacto", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error actualizando contacto",
        },
      };
    }
  },
);

export const updateContacto = withCors(updateContactoHandler);

app.http("updateContacto", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "contactos/{id:int?}",

  handler: updateContacto,
});
