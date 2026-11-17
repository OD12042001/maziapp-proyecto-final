import { z } from "zod";

/**
 * Validación de entrada para PATCH /api/contactos/{id}/actividad --
 * Fase Actividad.
 *
 * Dos ramas mutuamente excluyentes, UNA por request -- el Service
 * (`contactoActividad.service.ts`) decide cuál aplicar leyendo el
 * `TipoContacto` REAL de la fila ya existente en `dbo.Contactos`,
 * nunca de lo que el cliente declare en el body (mismo criterio que
 * `contacto.service.ts::actualizarContacto` distingue NATURAL/JURIDICA
 * para nombres/razonSocial):
 *
 * - NATURAL: `gradoInstruccion` + `profesionOcupacion` OBLIGATORIOS
 *   (corrección explícita del dueño del proyecto sobre el diseño
 *   inicial -- la interfaz de referencia los marca con "*").
 *
 * - JURIDICA: únicamente `ciiuId`, OBLIGATORIO. `.strict()` en ambos
 *   esquemas rechaza con 400 cualquier campo de la rama contraria (por
 *   ejemplo, enviar `ciiuId` para un contacto NATURAL, o
 *   `gradoInstruccion` para uno JURIDICA) antes de tocar el Service.
 *
 * `gradoInstruccion` solo admite los dos valores confirmados
 * (TECNICO/SUPERIOR) -- no se agrega ninguna otra opción por
 * iniciativa propia.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): `trabajosNuevos` fue RETIRADO de este schema.
 * Trabajos Dependientes ya no se guarda como parte de "Guardar" de
 * Actividad -- tiene sus propios endpoints independientes bajo
 * `contactos/{contactoId}/trabajos-dependientes[/{trabajoId}]` (ver
 * trabajoDependiente.validator.ts/.service.ts/.repository.ts, Etapa 2).
 * Como `actividadNaturalSchema` sigue siendo `.strict()`, enviar
 * `trabajosNuevos` en el body de este PATCH ahora se RECHAZA con 400
 * (campo no declarado), en vez de aceptarse y persistirse -- es el
 * comportamiento intencional de esta etapa, no un descuido.
 */
export const GRADOS_INSTRUCCION = ["TECNICO", "SUPERIOR"] as const;

const actividadNaturalSchema = z
  .object({
    gradoInstruccion: z.enum(GRADOS_INSTRUCCION),
    profesionOcupacion: z.string().trim().min(1, "Profesión/Ocupación es requerida").max(150),
  })
  .strict();

const actividadJuridicaSchema = z
  .object({
    ciiuId: z.number().int().positive(),
  })
  .strict();

export type ActividadNaturalInput = z.infer<typeof actividadNaturalSchema>;
export type ActividadJuridicaInput = z.infer<typeof actividadJuridicaSchema>;

export function validateActividadNatural(body: unknown) {
  return actividadNaturalSchema.safeParse(body);
}

export function validateActividadJuridica(body: unknown) {
  return actividadJuridicaSchema.safeParse(body);
}
