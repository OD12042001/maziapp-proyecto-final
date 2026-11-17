import { z } from "zod";

/**
 * Validación de entrada para Direcciones (Fase Direcciones) --
 * POST/PATCH /api/contactos/{contactoId}/direcciones[/{direccionId}].
 *
 * `idContacto` NO forma parte de este schema: viaja siempre en la
 * ruta (`req.params.contactoId`), nunca en el body -- mismo criterio
 * que representante.validator.ts (contactoId no es parte del payload
 * de alta de un representante) y que updateContacto.ts (el id del
 * recurso nunca se lee del body). `idDistrito` se valida aquí solo
 * como número entero positivo; su EXISTENCIA real en dbo.Distritos se
 * verifica en direccion.service.ts (DireccionDistritoInvalidoError),
 * no aquí -- Zod no puede consultar la base de datos.
 *
 * `.strict()`: cualquier propiedad no declarada (idDireccion,
 * idContacto, activo, fechaCreacion, fechaModificacion, o cualquier
 * otro campo técnico) hace que TODO el parseo falle con 400 -- mismo
 * criterio que contacto.validator.ts / representante.validator.ts.
 */
const direccionBaseSchema = z
  .object({
    idDistrito: z
      .number({ invalid_type_error: "Selecciona un distrito válido" })
      .int("Selecciona un distrito válido")
      .positive("Selecciona un distrito válido"),

    calle: z.string().trim().min(1, "Calle es requerida").max(250, "Calle demasiado larga"),
    numero: z.string().trim().min(1, "Número es requerido").max(30, "Número demasiado largo"),

    departamentoInterior: z
      .string()
      .trim()
      .max(100, "Departamento/Interior demasiado largo")
      .optional(),
  })
  .strict();

export type DireccionInput = z.infer<typeof direccionBaseSchema>;

export function validateDireccionCreate(body: unknown) {
  return direccionBaseSchema.safeParse(body);
}

// El formulario "Dirección" reutiliza exactamente los mismos campos
// tanto para crear como para editar (ver especificación de esta
// fase): no existe un subconjunto "parcial" para PATCH -- se reenvía
// siempre el objeto completo, mismo criterio que
// representanteCreateSchema (que tampoco tiene un equivalente
// "update" independiente).
export function validateDireccionUpdate(body: unknown) {
  return direccionBaseSchema.safeParse(body);
}
