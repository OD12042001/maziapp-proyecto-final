import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as contactoActividadService from "../../services/contactos/contactoActividad.service";

/**
 * 📋 GET /api/contactos/{contactoId}/actividad -- Fase Actividad.
 *
 * Precarga la pestaña "Actividad" de la Ficha Contacto. Mismo patrón
 * de seguridad que getDirecciones.ts/getRepresentantes.ts:
 *   - withAuth(CONTACTOS_ROLES_PERMITIDOS, ...), sin ningún rol nuevo.
 *   - El ownership (¿el contacto existe?, ¿es del usuario
 *     autenticado?) se resuelve en el Service reutilizando
 *     obtenerContactoPorId -- 404 en ambos casos (anti-enumeración).
 *
 * Respuesta: { tipoContacto, actividad, trabajos } -- `actividad` es
 * `null` si el contacto todavía no tiene fila en dbo.ContactoActividad
 * (nunca se crea una fila vacía solo por consultar). `trabajos` es
 * siempre `[]` para JURIDICA.
 */
const getContactoActividadHandler = withAuth(
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

      const resultado = await contactoActividadService.obtenerActividad(contactoId, user);

      // 🔐 Anti-enumeración: el mismo 404 tanto si el contacto no
      // existe como si existe pero no pertenece al usuario autenticado.
      if (!resultado) {
        return {
          status: 404,

          jsonBody: {
            message: "Contacto no encontrado",
          },
        };
      }

      return {
        status: 200,

        jsonBody: resultado,
      };
    } catch (error: any) {
      context.error("Error consultando actividad del contacto", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error consultando actividad del contacto",
        },
      };
    }
  },
);

export const getContactoActividad = withCors(getContactoActividadHandler);

app.http("getContactoActividad", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/{contactoId}/actividad",

  handler: getContactoActividad,
});
