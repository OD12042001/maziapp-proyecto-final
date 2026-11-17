import { z } from "zod";

/**
 * Validación de entrada para el autocompletado de CIIU -- Fase
 * Actividad -- GET /api/ciiu?search=...
 *
 * Mismo criterio exacto que `ubigeo.validator.ts::buscarDistritosQuerySchema`
 * -- catálogo de solo lectura, sin dato de ningún contacto en
 * particular, búsqueda por código o descripción resuelta enteramente
 * en SQL Server (ver `ciiu.repository.ts`).
 */
const buscarCiiuQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(2, "Escribe al menos 2 caracteres para buscar")
      .max(100, "Búsqueda demasiado larga"),
  })
  .strict();

export type BuscarCiiuQuery = z.infer<typeof buscarCiiuQuerySchema>;

export function validateBuscarCiiuQuery(query: unknown) {
  return buscarCiiuQuerySchema.safeParse(query);
}
