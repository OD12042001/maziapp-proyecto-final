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
import * as contactoActividadService from "../../services/contactos/contactoActividad.service";
import {
  ActividadTipoIncorrectoError,
  ActividadCiiuInvalidoError,
} from "../../services/contactos/contactoActividad.service";
import {
  validateActividadNatural,
  validateActividadJuridica,
} from "../../validators/contactoActividad.validator";

/**
 * ✏️ PATCH /api/contactos/{contactoId}/actividad -- Fase Actividad.
 *
 * Endpoint ÚNICO y transaccional para el botón "Guardar" de la
 * pestaña Actividad -- guarda GradoInstruccion + ProfesionOcupacion
 * (para NATURAL) o únicamente el CIIU (para JURIDICA).
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): este endpoint YA NO acepta ni procesa
 * `trabajosNuevos`/`trabajosModificados`/`trabajosEliminados` --
 * Trabajos Dependientes tiene sus propios endpoints independientes
 * (POST/PATCH/DELETE /api/contactos/{contactoId}/trabajos-dependientes[/{trabajoId}],
 * Etapa 2), cada uno con su propia llamada HTTP y su propia
 * transacción. `actividadNaturalSchema` (`.strict()`) ya no declara
 * `trabajosNuevos`, así que enviarlo en el body de este PATCH se
 * rechaza con 400 en vez de persistirse.
 *
 * 🔐 NATURAL vs JURIDICA -- el Backend NUNCA confía en que el
 * Frontend ya sabe qué rama mostrar. Este Function primero resuelve
 * el `TipoContacto` REAL de la fila (reutilizando
 * `contactoService.obtenerContactoPorId`, mismo criterio de ownership
 * que updateContacto.ts) y, según ese valor -- no según ningún campo
 * del body -- decide si valida el body con `validateActividadNatural`
 * o `validateActividadJuridica`. El Service vuelve a verificar lo
 * mismo internamente (defensa en profundidad, ver
 * `ActividadTipoIncorrectoError`).
 *
 * No toca dbo.Contactos, dbo.Actividades, ni ningún otro endpoint
 * existente.
 */
const updateContactoActividadHandler = withAuth(
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

      // 🔐 Resuelve el TipoContacto REAL antes de decidir qué schema
      // Zod aplicar -- mismo 404 anti-enumeración que el resto del
      // módulo si el contacto no existe o no es del usuario
      // autenticado.
      const contacto = await contactoService.obtenerContactoPorId(contactoId, user);

      if (!contacto) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      const rawBody = await req.json();

      if (contacto.tipoContacto === "NATURAL") {
        const parsed = validateActividadNatural(rawBody);

        if (!parsed.success) {
          context.warn("Validación Zod fallida en updateContactoActividad (NATURAL)", {
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
              message: "Datos de actividad inválidos",
              errors: {
                fieldErrors: flattened.fieldErrors,
                formErrors: flattened.formErrors,
              },
            },
          };
        }

        const guardado = await contactoActividadService.guardarActividadNatural(
          contactoId,
          parsed.data,
          user,
        );

        if (!guardado) {
          return {
            status: 404,

            jsonBody: {
              message: "Contacto no encontrado",
            },
          };
        }

        context.log("Actividad (NATURAL) guardada", {
          oid: user?.oid,
          contactoId,
        });

        return {
          status: 200,

          jsonBody: guardado,
        };
      }

      // JURIDICA
      const parsed = validateActividadJuridica(rawBody);

      if (!parsed.success) {
        context.warn("Validación Zod fallida en updateContactoActividad (JURIDICA)", {
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
            message: "Datos de actividad inválidos",
            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const guardado = await contactoActividadService.guardarActividadJuridica(
        contactoId,
        parsed.data,
        user,
      );

      if (!guardado) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      context.log("Actividad (JURIDICA) guardada", {
        oid: user?.oid,
        contactoId,
      });

      return {
        status: 200,

        jsonBody: guardado,
      };
    } catch (error: any) {
      if (
        error instanceof ActividadTipoIncorrectoError ||
        error instanceof ActividadCiiuInvalidoError
      ) {
        context.warn("Guardado de actividad rechazado", {
          oid: user?.oid,
          motivo: error.name,
        });

        return {
          status: 400,

          jsonBody: {
            message: error.message,
          },
        };
      }

      // 🔐 MEJORA (mismo criterio que updateContacto.ts): no devolver
      // error.message al cliente; se loggea el detalle server-side.
      context.error("Error guardando actividad del contacto", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error guardando actividad del contacto",
        },
      };
    }
  },
);

export const updateContactoActividad = withCors(updateContactoActividadHandler);

app.http("updateContactoActividad", {
  methods: ["PATCH"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/actividad",

  handler: updateContactoActividad,
});
