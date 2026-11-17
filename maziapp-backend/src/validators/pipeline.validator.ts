import { z } from "zod";

/**
 * Contratos de entrada del módulo Pipeline (S06), derivados de
 * docs/openapi.yaml. Toda regla de forma vive aquí; el service solo
 * aplica reglas de negocio que dependen de datos ya persistidos.
 */

export const ESTADOS_OPORTUNIDAD = ["ACTIVA", "GANADA", "PERDIDA"] as const;

export const MONEDAS_OPORTUNIDAD = ["PEN", "USD"] as const;

/**
 * `monedaCodigo` es obligatoria cuando se informa `montoEstimado`: la
 * base exige que ambos estén presentes o ambos ausentes
 * (CK_Oportunidades_Moneda). Se valida aquí para devolver 400 con un
 * mensaje útil en lugar de un error de constraint.
 */
export const crearOportunidadSchema = z
  .object({
    contactoId: z
      .number()
      .int("contactoId debe ser un entero")
      .positive("contactoId debe ser mayor que cero"),
    montoEstimado: z
      .number()
      .positive("montoEstimado debe ser mayor que cero")
      .optional(),
    monedaCodigo: z.enum(MONEDAS_OPORTUNIDAD).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.montoEstimado !== undefined && value.monedaCodigo === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monedaCodigo"],
        message: "monedaCodigo es obligatoria cuando se informa montoEstimado",
      });
    }
  });

export const avanzarEtapaSchema = z
  .object({
    etapaDestinoCodigo: z
      .string()
      .min(1, "etapaDestinoCodigo es obligatoria")
      .max(30, "etapaDestinoCodigo admite hasta 30 caracteres"),
    observacion: z
      .string()
      .max(1000, "observacion admite hasta 1000 caracteres")
      .optional(),
  })
  .strict();

export const perderOportunidadSchema = z
  .object({
    motivo: z
      .string()
      .min(3, "motivo debe tener al menos 3 caracteres")
      .max(300, "motivo admite hasta 300 caracteres"),
  })
  .strict();

/**
 * Query string del listado. `page`/`pageSize` llegan como texto, de ahí
 * el `coerce`; los topes coinciden con el contrato (`pageSize` máximo
 * 100).
 */
export const listarOportunidadesQuerySchema = z
  .object({
    estado: z.enum(ESTADOS_OPORTUNIDAD).optional(),
    etapaCodigo: z.string().min(1).max(30).optional(),
    contactoId: z.coerce.number().int().positive().optional(),
    responsableId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CrearOportunidadInput = z.infer<typeof crearOportunidadSchema>;
export type AvanzarEtapaInput = z.infer<typeof avanzarEtapaSchema>;
export type PerderOportunidadInput = z.infer<typeof perderOportunidadSchema>;
export type ListarOportunidadesQuery = z.infer<
  typeof listarOportunidadesQuerySchema
>;
