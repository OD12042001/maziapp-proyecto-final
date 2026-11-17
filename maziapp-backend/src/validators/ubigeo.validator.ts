import { z } from "zod";

/**
 * Validación de entrada para el autocompletado de Distrito (Fase
 * Direcciones) -- GET /api/distritos?search=...
 *
 * El parámetro `search` viaja siempre como valor parametrizado hacia
 * SQL Server (ver ubigeo.repository.ts::buscarDistritos) -- este
 * schema solo acota longitud/tipo antes de llegar a la query, nunca
 * concatena nada en SQL. Un `search` demasiado corto (<2 caracteres)
 * se rechaza aquí para evitar búsquedas triviales que devuelvan
 * demasiadas filas antes de aplicar el límite fijo de la query.
 *
 * `.strict()`: cualquier propiedad no declarada aquí hace que el
 * parseo falle con 400 -- mismo criterio que el resto de validadores
 * del proyecto (contacto.validator.ts, representante.validator.ts).
 */
const buscarDistritosQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(2, "Escribe al menos 2 caracteres para buscar")
      .max(100, "Búsqueda demasiado larga"),
  })
  .strict();

export type BuscarDistritosQuery = z.infer<typeof buscarDistritosQuerySchema>;

export function validateBuscarDistritosQuery(query: unknown) {
  return buscarDistritosQuerySchema.safeParse(query);
}
