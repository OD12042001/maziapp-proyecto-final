import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { withAuth } from "../../middleware/withAuth";
import { withCors } from "../../middleware/withCors";
import { CONTACTOS_ROLES_PERMITIDOS } from "../../config/roles";

import * as ciiuService from "../../services/ciiu/ciiu.service";
import { validateBuscarCiiuQuery } from "../../validators/ciiu.validator";

/**
 * 📋 GET /api/ciiu?search=... -- Fase Actividad.
 *
 * Autocompletado de CIIU para la rama JURIDICA de la pestaña
 * Actividad. Mismo patrón que getDistritos.ts: catálogo de solo
 * lectura, protegido igual que el resto del módulo Contactos
 * (CONTACTOS_ROLES_PERMITIDOS) aunque no dependa de ningún contacto en
 * particular. Ruta a nivel raíz (`ciiu`, no anidada bajo `contactos`).
 *
 * NOTA: dbo.CatalogoCiiu existe únicamente como ESTRUCTURA (ver
 * schema_v6_CatalogoCiiu_propuesto.sql) -- sin datos cargados hasta
 * que se confirme la fuente oficial. Este endpoint puede devolver una
 * lista vacía hasta ese momento; eso es el comportamiento correcto,
 * no un error.
 */
const getCiiuHandler = withAuth(
  CONTACTOS_ROLES_PERMITIDOS,

  async (
    req: HttpRequest,
    context: InvocationContext,
    user: any,
  ): Promise<HttpResponseInit> => {
    try {
      const search = req.query.get("search") ?? "";

      const parsed = validateBuscarCiiuQuery({ search });

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

      const resultados = await ciiuService.buscarCiiu(parsed.data.search);

      return {
        status: 200,

        jsonBody: resultados,
      };
    } catch (error: any) {
      context.error("Error buscando CIIU", error);

      return {
        status: 500,

        jsonBody: {
          message: "Error interno",
        },
      };
    }
  },
);

export const getCiiu = withCors(getCiiuHandler);

app.http("getCiiu", {
  methods: ["GET"],

  authLevel: "anonymous",

  route: "ciiu",

  handler: getCiiu,
});
