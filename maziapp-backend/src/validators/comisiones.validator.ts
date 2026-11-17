import { z } from "zod";

/**
 * Contratos de entrada del módulo Comisiones y reversión (S16/S17),
 * derivados de `docs/openapi.yaml` (`/comisiones`, `/comisiones/{id}`,
 * `/comisiones/{id}/reversion`).
 */

export const ESTADOS_COMISION = [
  "PENDIENTE",
  "LIQUIDADA",
  "REVERTIDA",
] as const;

export const MOTIVOS_REVERSION = [
  "KYC_RECHAZADO",
  "DESEMBOLSO_NO_CONCRETADO",
] as const;

export const listarComisionesQuerySchema = z
  .object({
    estado: z.enum(ESTADOS_COMISION).optional(),
    freelanceId: z.string().uuid("freelanceId debe ser un GUID").optional(),
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

export const revertirComisionSchema = z
  .object({
    motivoCodigo: z.enum(MOTIVOS_REVERSION),
    motivoDetalle: z
      .string()
      .max(500, "motivoDetalle admite hasta 500 caracteres")
      .optional(),
    estadoKyc: z
      .string()
      .max(20, "estadoKyc admite hasta 20 caracteres")
      .optional(),
    estadoDesembolso: z
      .string()
      .max(20, "estadoDesembolso admite hasta 20 caracteres")
      .optional(),
    fechaEvaluacionUtc: z.coerce.date({
      invalid_type_error:
        "fechaEvaluacionUtc debe ser una fecha ISO 8601 válida",
    }),
    observacion: z
      .string()
      .max(1000, "observacion admite hasta 1000 caracteres")
      .optional(),
  })
  .strict();

export type ListarComisionesQuery = z.infer<typeof listarComisionesQuerySchema>;
export type RevertirComisionInput = z.infer<typeof revertirComisionSchema>;
