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

const getContactosHandler = withAuth(
  // Migración de roles (agosto 2026): lectura de Contactos exclusiva de
  // Freelance/ejecutivo_inversion — ver maziapp-backend/src/config/roles.ts.
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const id = req.params.id;

      // 🔍 GET POR ID
      if (id) {
        const contacto = await contactoService.obtenerContactoPorId(id, user);

        if (!contacto) {
          return {
            status: 404,

            jsonBody: {
              message: "Contacto no encontrado",
            },
          };
        }

        return {
          status: 200,

          jsonBody: contacto,
        };
      }

      // 📋 LISTAR
      const data = await contactoService.listarContactos(user);

      return {
        status: 200,

        jsonBody: data,
      };
    } catch (error: any) {
      // 🔐 MEJORA (auditoría #3 - ALTO): no devolver error.message al cliente.
      context.error("Error obteniendo contactos", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

// 🔐 Fase 3.2: mismo patrón que createContacto.ts — `withCors` por
// fuera de `withAuth`, sin tocar withAuth.ts/validateToken.ts.
export const getContactos = withCors(getContactosHandler);

app.http("getContactos", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/{id:int?}",

  handler: getContactos,
});
