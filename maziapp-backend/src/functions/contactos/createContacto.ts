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
import { validateContactoCreate } from "../../validators/contacto.validator";

// Números de error nativos de SQL Server para violación de restricción
// UNIQUE (informe de seguridad, punto U; Fase 3, punto 8). Aplican al
// índice único UQ_Contactos_TipoDocumento_NumeroDocumento.
const SQL_UNIQUE_VIOLATION_CODES = new Set([2601, 2627]);

// 🔐 Fase 3, punto 10: nunca registrar el documento completo (PII). Se
// registran solo los últimos N caracteres para trazabilidad de soporte.
function ultimosCaracteres(valor: string | undefined, n = 4): string {
  if (!valor) return "";
  return valor.length <= n ? valor : valor.slice(-n);
}

const createContactoHandler = withAuth(
  // Migración de roles (agosto 2026): creación de Contactos exclusiva de
  // Freelance/ejecutivo_inversion — ver maziapp-backend/src/config/roles.ts.
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const rawBody = await req.json();

      // 🔐 Validar el payload antes de tocar la base de datos. `.strict()`
      // en el schema rechaza cualquier propiedad no prevista —
      // incluyendo responsableId/creadoId/id/estadoContacto si el
      // cliente los enviara — con un 400, sin llegar siquiera al
      // Service (Fase 3, secciones 3-5).
      const parsed = validateContactoCreate(rawBody);

      if (!parsed.success) {
        // 🔎 Fase 3.4, punto 6 — DIAGNÓSTICO TEMPORAL PARA DESARROLLO
        // LOCAL. Se registra únicamente `path` (qué campo) y `code`
        // (qué tipo de problema: campo faltante, tipo inválido,
        // propiedad no reconocida, etc.) de cada issue de Zod.
        // Deliberadamente NO se registra `message` ni `received`/
        // `expected`: para issues como "valor de enum inválido", Zod
        // incluye el valor recibido dentro del mensaje, y ese valor
        // podría ser un documento/nombre real si el cliente envía el
        // campo equivocado en el lugar equivocado. Nunca se registra
        // el body crudo, el header Authorization, ni ningún secreto.
        //
        // ⚠️ Quitar este bloque (o degradarlo a nivel debug) antes de
        // considerar el endpoint listo para QA/producción — ver
        // informe de Fase 3.4, sección H.
        context.warn("Validación Zod fallida en createContacto", {
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
            message: "Datos de contacto inválidos",
            // Fase 3.4, punto 7: antes solo se devolvía `fieldErrors`
            // (errores atados a un campo concreto). Los errores sin
            // campo asociado —como "propiedad no reconocida: dni",
            // que Zod reporta con path raíz— quedaban silenciosamente
            // fuera de la respuesta. Se agrega `formErrors` para que
            // el Frontend (o quien depure con DevTools) vea también
            // ese tipo de error. Ningún dato sensible: son nombres de
            // campo y mensajes de validación genéricos, no valores
            // enviados por el usuario.
            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const saved = await contactoService.crearContacto(parsed.data, user);

      // 🔐 Log sin PII completa (Fase 3, punto 10): solo oid del
      // actor, tipo/id del contacto creado y los últimos 4 caracteres
      // del documento — nunca el documento completo ni el body crudo.
      context.log("Contacto creado", {
        oid: user?.oid,
        contactoId: saved.id,
        tipoContacto: saved.tipoContacto,
        documentoSufijo: ultimosCaracteres(parsed.data.numeroDocumento),
      });

      return {
        status: 201,

        jsonBody: saved,
      };
    } catch (error: any) {
      // 🔐 Conflicto de unicidad (Fase 3, punto 8): se traduce a 409
      // con un mensaje seguro, sin exponer el nombre de la
      // constraint, la tabla ni el error nativo de SQL Server.
      if (error?.number && SQL_UNIQUE_VIOLATION_CODES.has(error.number)) {
        context.warn("Conflicto de documento duplicado al crear contacto", {
          oid: user?.oid,
        });

        return {
          status: 409,

          jsonBody: {
            message:
              "Ya existe un contacto registrado con ese tipo y número de documento.",
          },
        };
      }

      // 🔐 MEJORA (auditoría #3 - ALTO): no devolver error.message al
      // cliente; se loggea el detalle server-side únicamente.
      context.error("Error creando contacto", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error creando contacto",
        },
      };
    }
  },
);

// 🔐 Fase 3.2: `withCors` envuelve por FUERA a `withAuth` — agrega los
// headers Access-Control-* a cualquier respuesta (200/201/400/409/500,
// e incluso los 401/403 que produce withAuth) sin modificar en
// absoluto la lógica de autenticación/autorización de withAuth.ts.
export const createContacto = withCors(createContactoHandler);

app.http("createContacto", {
  methods: ["POST"],

  authLevel: "anonymous",

  route: "contactos",

  handler: createContacto,
});
