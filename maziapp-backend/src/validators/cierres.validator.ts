import { z } from "zod";

/**
 * Contratos de entrada del módulo Cierres de inversión (S15), derivados
 * de `docs/openapi.yaml` (`/cierres`, `/cierres/{cierreId}`).
 */

export const ESTADOS_CIERRE = ["REGISTRADO", "ANULADO"] as const;

export const MONEDAS_CIERRE = ["PEN", "USD"] as const;

export const registrarCierreSchema = z
  .object({
    oportunidadId: z
      .number()
      .int("oportunidadId debe ser un entero")
      .min(1, "oportunidadId debe ser mayor que cero"),
    proyectoId: z
      .number()
      .int("proyectoId debe ser un entero")
      .min(1, "proyectoId debe ser mayor que cero"),
    montoCaptado: z
      .number()
      .positive("montoCaptado debe ser mayor que cero"),
    monedaCodigo: z.enum(MONEDAS_CIERRE),
    fechaCierreUtc: z.coerce.date({
      invalid_type_error: "fechaCierreUtc debe ser una fecha ISO 8601 válida",
    }),
  })
  .strict();

export const listarCierresQuerySchema = z
  .object({
    proyectoId: z.coerce
      .number()
      .int("proyectoId debe ser un entero")
      .min(1, "proyectoId debe ser mayor que cero")
      .optional(),
    freelanceId: z.string().uuid("freelanceId debe ser un GUID").optional(),
    estado: z.enum(ESTADOS_CIERRE).optional(),
    desde: z.coerce
      .date({ invalid_type_error: "desde debe ser una fecha válida" })
      .optional(),
    hasta: z.coerce
      .date({ invalid_type_error: "hasta debe ser una fecha válida" })
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.desde && value.hasta && value.desde > value.hasta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["desde"],
        message: "desde no puede ser posterior a hasta",
      });
    }
  });

export type RegistrarCierreInput = z.infer<typeof registrarCierreSchema>;
export type ListarCierresQuery = z.infer<typeof listarCierresQuerySchema>;
