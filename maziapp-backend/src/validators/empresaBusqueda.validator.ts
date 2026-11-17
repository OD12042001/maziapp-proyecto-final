import { z } from "zod";

/**
 * Validación de entrada para el buscador de Empresa -- Fase Actividad
 * -- GET /api/contactos/empresas?search=...
 *
 * Mismo criterio que `ubigeo.validator.ts::buscarDistritosQuerySchema`:
 * `search` viaja siempre como valor parametrizado hacia SQL Server
 * (ver `empresaBusqueda.repository.ts`), este schema solo acota
 * longitud/tipo. Mínimo de 2 caracteres para evitar búsquedas
 * triviales.
 *
 * 🔐 IMPORTANTE (decisión explícita del dueño del proyecto): esta
 * búsqueda NO amplía el alcance de autorización de Contactos. El
 * `search` solo decide QUÉ texto buscar -- el ALCANCE (qué Contactos
 * JURIDICA son visibles) lo decide siempre
 * `empresaBusqueda.service.ts`/`.repository.ts` acotando por
 * `ResponsableId = user.oid`, exactamente igual que
 * `contacto.service.ts::listarContactos` hoy. Este validador no tiene
 * ninguna relación con esa regla -- se documenta aquí solo para que
 * quien lea este archivo no asuma lo contrario.
 */
const buscarEmpresasQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(2, "Escribe al menos 2 caracteres para buscar")
      .max(200, "Búsqueda demasiado larga"),
  })
  .strict();

export type BuscarEmpresasQuery = z.infer<typeof buscarEmpresasQuerySchema>;

export function validateBuscarEmpresasQuery(query: unknown) {
  return buscarEmpresasQuerySchema.safeParse(query);
}
