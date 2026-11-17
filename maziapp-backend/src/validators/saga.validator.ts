import { z } from "zod";

/**
 * Contrato de entrada de la consulta de Saga BPM
 * (`GET /sagas/{correlationId}`), según `docs/openapi.yaml`.
 */
export const correlationIdPathSchema = z
  .string()
  .min(8, "correlationId debe tener al menos 8 caracteres")
  .max(64, "correlationId admite hasta 64 caracteres")
  .regex(/^[A-Za-z0-9._:-]+$/, "correlationId contiene caracteres inválidos");
