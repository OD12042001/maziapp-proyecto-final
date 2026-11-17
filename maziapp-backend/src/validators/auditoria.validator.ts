import { z } from "zod";

/**
 * Contratos de entrada de los endpoints de consulta de auditoría (S40),
 * derivados de `docs/openapi.yaml`. No hay contrato de escritura: la
 * bitácora solo se alimenta desde los servicios.
 */

export const RESULTADOS_AUDITORIA = ["EXITO", "RECHAZO", "ERROR"] as const;

/** `bigint` viaja como string de dígitos (ver openapi: EventoId/OutboxId). */
export const identificadorBigintSchema = z
  .string()
  .regex(/^[0-9]{1,18}$/, "El identificador debe ser numérico");

export const listarAuditoriaQuerySchema = z
  .object({
    servicioCodigo: z.string().min(1).max(10).optional(),
    entidad: z.string().min(1).max(80).optional(),
    entidadId: z.string().min(1).max(64).optional(),
    correlationId: z.string().min(1).max(64).optional(),
    usuarioId: z.string().uuid("usuarioId debe ser un GUID").optional(),
    resultado: z.enum(RESULTADOS_AUDITORIA).optional(),
    desde: z.coerce.date({ invalid_type_error: "desde debe ser una fecha" }).optional(),
    hasta: z.coerce.date({ invalid_type_error: "hasta debe ser una fecha" }).optional(),
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

export type ListarAuditoriaQuery = z.infer<typeof listarAuditoriaQuerySchema>;
