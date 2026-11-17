import { z } from "zod";

import { identificadorBigintSchema } from "./auditoria.validator";

/**
 * Contratos de entrada del ESB lógico, derivados de `docs/openapi.yaml`
 * (`/esb/outbox`, `/esb/outbox/fallidos`, `/esb/outbox/{id}`,
 * `/esb/outbox/procesar`).
 */

export const ESTADOS_OUTBOX = [
  "PENDIENTE",
  "EN_PROCESO",
  "PUBLICADO",
  "FALLIDO",
  "MUERTO",
] as const;

export const listarOutboxQuerySchema = z
  .object({
    estado: z.enum(ESTADOS_OUTBOX).optional(),
    tipoEvento: z.string().min(1).max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const listarOutboxFallidosQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const procesarOutboxSchema = z
  .object({
    limite: z
      .number()
      .int("limite debe ser un entero")
      .min(1, "limite debe ser al menos 1")
      .max(100, "limite admite hasta 100")
      .default(20),
  })
  .strict();

export { identificadorBigintSchema };

export type ListarOutboxQuery = z.infer<typeof listarOutboxQuerySchema>;
export type ListarOutboxFallidosQuery = z.infer<
  typeof listarOutboxFallidosQuerySchema
>;
export type ProcesarOutboxInput = z.infer<typeof procesarOutboxSchema>;
