import { z } from "zod";

import { SEXOS, TELEFONO_REGEX } from "./contacto.validator";

/**
 * Validación de entrada para actualización de Contactos — Fase 3.15
 * (Ficha de contacto, pestañas Cliente + Ubicación, alcance Fase 7A).
 *
 * Reglas de diseño (mismo criterio de seguridad que
 * `contacto.validator.ts`, ver ese archivo para el detalle):
 *
 * - `.strict()`: cualquier propiedad no declarada aquí — incluyendo
 *   explícitamente "id", "responsableId", "creadoId", "creadoFecha",
 *   "creadoNombre", "creadoCorreo", "actualizadoId", "actualizadoFecha",
 *   "actualizadoNombre", "actualizadoCorreo", "estadoContacto" y,
 *   deliberadamente, también "tipoContacto", "tipoDocumento" y
 *   "numeroDocumento" (campos de identificación — Fase 7A: NO deben
 *   poder modificarse desde este endpoint) — hace que TODO el parseo
 *   falle con 400 en vez de descartarse en silencio.
 *
 * - Todos los campos son `.optional()` (actualización PARCIAL): el
 *   cliente solo envía las claves de la sección que está guardando
 *   (Cliente o Ubicación). Una clave AUSENTE significa "no tocar esa
 *   columna" — la lógica de "solo actualizar lo que vino" vive en
 *   `contacto.repository.ts::updateContacto()`, no aquí. Zod solo
 *   valida el FORMATO de lo que sí llega.
 *
 * - `nombres`/`apellidos`/`razonSocial` mantienen el mismo
 *   `.min(1)` que `contacto.validator.ts`: si el cliente decide
 *   incluir la clave, no puede enviarla vacía (evita que una
 *   actualización parcial deje sin nombre a un contacto NATURAL o sin
 *   razón social a uno JURIDICA). La coherencia cruzada contra el
 *   `tipoContacto` YA EXISTENTE en BD (una persona jurídica no puede
 *   guardar `nombres`/`apellidos`, una natural no puede guardar
 *   `razonSocial`) no puede resolverse aquí — Zod no conoce el estado
 *   de la fila — se valida en `contacto.service.ts::actualizarContacto()`.
 */
const contactoUpdateSchema = z
  .object({
    nombres: z.string().trim().min(1, "Nombres no puede quedar vacío").max(120).optional(),
    apellidos: z.string().trim().min(1, "Apellidos no puede quedar vacío").max(120).optional(),
    razonSocial: z
      .string()
      .trim()
      .min(1, "Razón social no puede quedar vacía")
      .max(200)
      .optional(),

    fechaNacimiento: z.string().date("Fecha de nacimiento inválida").optional(),
    sexo: z.enum(SEXOS).optional(),
    estadoCivil: z.string().trim().max(30).optional(),
    nacionalidad: z.string().trim().max(60).optional(),
    paisResidencia: z.string().trim().max(60).optional(),
    esPep: z.boolean().optional(),

    celular: z.string().trim().regex(TELEFONO_REGEX, "Celular inválido").optional(),
    correo: z.string().trim().max(150).email("Correo inválido").optional(),
    telefonoFijo: z.string().trim().regex(TELEFONO_REGEX, "Teléfono inválido").optional(),
  })
  .strict();

export type ContactoUpdateInput = z.infer<typeof contactoUpdateSchema>;

export function validateContactoUpdate(body: unknown) {
  return contactoUpdateSchema.safeParse(body);
}
