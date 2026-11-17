import { z } from "zod";

/**
 * Validación de entrada para un Trabajo Dependiente -- Fase Actividad.
 *
 * Un trabajo dependiente solo tiene sentido asociado a un Contacto
 * NATURAL (verificado en `contactoActividad.service.ts` contra el
 * `TipoContacto` real de la fila en BD, nunca aquí -- Zod no conoce el
 * tipo del contacto al que pertenece este payload).
 *
 * Empresa: exactamente uno de `empresaContactoId`/`empresaNombreLibre`
 * -- nunca ambos, nunca ninguno (`superRefine` abajo). El Frontend
 * nunca expone estos dos nombres técnicos al usuario: el componente de
 * Actividad decide cuál enviar según si el usuario seleccionó una
 * empresa del buscador o escribió el nombre a mano (ver
 * `contacto-actividad.component.ts`).
 *
 * `.strict()`: cualquier propiedad no declarada aquí (por ejemplo "id"
 * o cualquier campo de auditoría) hace que TODO el parseo falle con
 * 400 -- mismo criterio de seguridad que el resto de los validators
 * del módulo Contactos (`contacto.validator.ts`,
 * `representante.validator.ts`, `direccion.validator.ts`).
 */
const trabajoDependienteBaseSchema = z
  .object({
    empresaContactoId: z.number().int().positive().optional(),
    empresaNombreLibre: z.string().trim().min(1).max(200).optional(),

    cargo: z.string().trim().min(2, "Cargo es requerido").max(100),

    desde: z.string().date("Fecha 'Desde' inválida"),
    hasta: z.string().date("Fecha 'Hasta' inválida").optional(),
  })
  .strict();

export const trabajoDependienteSchema = trabajoDependienteBaseSchema.superRefine((data, ctx) => {
  const tieneEmpresaContacto = data.empresaContactoId !== undefined;
  const tieneEmpresaLibre = data.empresaNombreLibre !== undefined;

  if (tieneEmpresaContacto === tieneEmpresaLibre) {
    // Ambos presentes o ambos ausentes -- exactamente uno es válido.
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["empresaContactoId"],
      message: "Empresa es requerida",
    });
  }

  if (data.hasta !== undefined && data.hasta < data.desde) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["hasta"],
      message: "'Hasta' no puede ser anterior a 'Desde'",
    });
  }
});

export type TrabajoDependienteInput = z.infer<typeof trabajoDependienteBaseSchema>;

export function validateTrabajoDependiente(body: unknown) {
  return trabajoDependienteSchema.safeParse(body);
}

// El formulario "Trabajo dependiente" reutiliza exactamente los mismos
// campos tanto para crear como para editar (mismo criterio que
// direccion.validator.ts::validateDireccionUpdate -- no existe un
// subconjunto "parcial" para PATCH, se reenvía siempre el objeto
// completo). Agregado en la Etapa 2 (arquitectura independiente,
// patrón Direcciones) para que updateTrabajoDependiente.ts tenga su
// propio nombre de función de validación, simétrico a
// createTrabajoDependiente.ts, sin modificar el schema ni el
// comportamiento de validateTrabajoDependiente.
export function validateTrabajoDependienteUpdate(body: unknown) {
  return trabajoDependienteSchema.safeParse(body);
}
