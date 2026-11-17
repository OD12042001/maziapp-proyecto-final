import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as ubigeoService from "../../services/ubigeo/ubigeo.service";
import { validateBuscarDistritosQuery } from "../../validators/ubigeo.validator";

/**
 * 📋 GET /api/distritos?search=... -- Fase Direcciones.
 *
 * Autocompletado de Distrito para el formulario "Dirección". Decisión
 * de esta fase (ver informe final): se protege con el mismo
 * withAuth(CONTACTOS_ROLES_PERMITIDOS, ...) que el resto del módulo
 * Contactos, aunque el catálogo de ubigeo en sí no contenga datos de
 * ningún contacto en particular -- ningún usuario no autenticado
 * puede consultarlo. Ruta a nivel raíz (`distritos`, no anidada bajo
 * `contactos/{id}`) porque la búsqueda no depende de ningún contacto
 * concreto.
 *
 * Búsqueda ejecutada enteramente en SQL Server, con JOIN a
 * Provincias/Departamentos (ver ubigeo.repository.ts) -- nunca
 * fetch-all + filtrado en Node.
 */
const getDistritosHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const search = req.query.get("search") ?? "";

      const parsed = validateBuscarDistritosQuery({ search });

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

      const distritos = await ubigeoService.buscarDistritos(parsed.data.search);

      return {
        status: 200,

        jsonBody: distritos,
      };
    } catch (error: any) {
      context.error("Error buscando distritos", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getDistritos = withCors(getDistritosHandler);

app.http("getDistritos", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "distritos",

  handler: getDistritos,
});
