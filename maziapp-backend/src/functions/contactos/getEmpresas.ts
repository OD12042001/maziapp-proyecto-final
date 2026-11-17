import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as empresaBusquedaService from "../../services/contactos/empresaBusqueda.service";
import { validateBuscarEmpresasQuery } from "../../validators/empresaBusqueda.validator";

/**
 * 📋 GET /api/contactos/empresas?search=... -- Fase Actividad.
 *
 * Autocompletado de "Empresa" para el modal "Trabajo dependiente"
 * (ícono de búsqueda). Mismo patrón que getDistritos.ts.
 *
 * 🔐 IMPORTANTE (corrección explícita del dueño del proyecto): esta
 * ruta NO amplía la regla de autorización de Contactos. Solo consulta
 * Contactos JURIDICA del usuario autenticado (mismo criterio de
 * ownership que `listarContactos`/`findContactosByOwner`) -- nunca la
 * cartera completa de otro Freelance. No se crea ninguna excepción de
 * seguridad para esta búsqueda.
 *
 * Ruta literal `contactos/empresas` -- Azure Functions v4 resuelve
 * segmentos literales antes que plantillas, por lo que no colisiona
 * con `contactos/{id?}` (mismo criterio que getReporteEmbed.ts /
 * getDistritos.ts para rutas de solo-lectura a nivel de módulo).
 */
const getEmpresasHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const search = req.query.get("search") ?? "";

      const parsed = validateBuscarEmpresasQuery({ search });

      if (!parsed.success) {
        const flattened = parsed.error.flatten();

        return {
          status: 400,

          jsonBody: {
            message: "Parámetro de búsqueda inválido",

            errors: {
              fieldErrors: flattened.fieldErrors,
              formErrors: flattened.formErrors,
            },
          },
        };
      }

      const empresas = await empresaBusquedaService.buscarEmpresas(parsed.data.search, user);

      return {
        status: 200,

        jsonBody: empresas,
      };
    } catch (error: any) {
      context.error("Error buscando empresas", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getEmpresas = withCors(getEmpresasHandler);

app.http("getEmpresas", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "contactos/empresas",

  handler: getEmpresas,
});
