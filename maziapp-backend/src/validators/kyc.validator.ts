import { z } from "zod";

/**
 * Contratos de entrada del módulo KYC (S12/S13), derivados de
 * docs/openapi.yaml. Toda regla de forma vive aquí; el service solo
 * aplica reglas de negocio que dependen de datos ya persistidos.
 *
 * Los estados replican los CHECK de `dbo.KycExpedientes` y
 * `dbo.KycDocumentos` (03-apf3-schema.sql). Si la base cambia, este
 * archivo debe cambiar con ella.
 */

export const ESTADOS_EXPEDIENTE_KYC = [
  "PENDIENTE",
  "EN_PROCESO",
  "VALIDADO",
  "RECHAZADO",
] as const;

export const ESTADOS_DOCUMENTO_KYC = [
  "PENDIENTE",
  "RECIBIDO",
  "VALIDADO",
  "RECHAZADO",
] as const;

/**
 * Estados que puede fijar el endpoint de revisión. `PENDIENTE` es el
 * estado inicial del checklist y no es un destino válido: no se
 * "desrecibe" un documento por esta vía.
 */
export const ESTADOS_REVISION_DOCUMENTO = [
  "RECIBIDO",
  "VALIDADO",
  "RECHAZADO",
] as const;

export const ESTADOS_DICTAMEN = ["VALIDADO", "RECHAZADO"] as const;

export const crearExpedienteSchema = z
  .object({
    oportunidadId: z
      .number()
      .int("oportunidadId debe ser un entero")
      .positive("oportunidadId debe ser mayor que cero"),
  })
  .strict();

export const registrarRecepcionSchema = z
  .object({
    documentoRequeridoCodigo: z
      .string()
      .min(1, "documentoRequeridoCodigo es obligatorio")
      .max(30, "documentoRequeridoCodigo admite hasta 30 caracteres"),
    archivoReferencia: z
      .string()
      .min(1, "archivoReferencia es obligatoria")
      .max(500, "archivoReferencia admite hasta 500 caracteres"),
    observacion: z
      .string()
      .max(1000, "observacion admite hasta 1000 caracteres")
      .optional(),
  })
  .strict();

/**
 * Un rechazo documental sin motivo es un expediente indefendible: el
 * contrato lo exige y el negocio lo necesita para notificar al cliente.
 */
export const revisarDocumentoSchema = z
  .object({
    estado: z.enum(ESTADOS_REVISION_DOCUMENTO),
    observacion: z
      .string()
      .max(1000, "observacion admite hasta 1000 caracteres")
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.estado === "RECHAZADO" && !value.observacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observacion"],
        message: "observacion es obligatoria cuando el estado es RECHAZADO",
      });
    }
  });

export const dictamenSchema = z
  .object({
    estado: z.enum(ESTADOS_DICTAMEN),
    observacion: z
      .string()
      .max(1000, "observacion admite hasta 1000 caracteres")
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.estado === "RECHAZADO" && !value.observacion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["observacion"],
        message: "observacion es obligatoria cuando el estado es RECHAZADO",
      });
    }
  });

/**
 * Query string del listado. `page`/`pageSize` llegan como texto, de ahí
 * el `coerce`; los topes coinciden con el contrato (`pageSize` máximo
 * 100).
 */
export const listarExpedientesQuerySchema = z
  .object({
    estado: z.enum(ESTADOS_EXPEDIENTE_KYC).optional(),
    contactoId: z.coerce.number().int().positive().optional(),
    oportunidadId: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type CrearExpedienteInput = z.infer<typeof crearExpedienteSchema>;
export type RegistrarRecepcionInput = z.infer<
  typeof registrarRecepcionSchema
>;
export type RevisarDocumentoInput = z.infer<typeof revisarDocumentoSchema>;
export type DictamenInput = z.infer<typeof dictamenSchema>;
export type ListarExpedientesQuery = z.infer<
  typeof listarExpedientesQuerySchema
>;
