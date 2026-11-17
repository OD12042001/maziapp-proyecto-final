import { z } from "zod";

/**
 * Validación de entrada para creación de Contactos — Fase 3 (modelo V1
 * aprobado en schema_v2_Contactos_propuesto.sql / Mazi_Flow_Fase1_1_
 * Validacion_Contactos.docx).
 *
 * Reglas de diseño de seguridad (ver informe de seguridad, puntos M/O/P,
 * y Fase 3 secciones 3-5):
 *
 * - `.strict()`: cualquier propiedad no declarada aquí — incluyendo
 *   "id", "responsableId", "creadoId", "creadoFecha", "creadoNombre",
 *   "creadoCorreo", "actualizadoId", "actualizadoFecha",
 *   "actualizadoNombre", "actualizadoCorreo" o "estadoContacto" —
 *   hace que TODO el parseo falle con un error 400, en vez de
 *   descartarse en silencio (comportamiento por defecto de Zod sin
 *   `.strict()`). El cliente NUNCA puede proponer estos campos, ni
 *   siquiera accidentalmente.
 *
 * - Los campos de auditoría (ResponsableId, CreadoId, CreadoFecha,
 *   CreadoNombre, CreadoCorreo, ActualizadoId, ActualizadoFecha,
 *   ActualizadoNombre, ActualizadoCorreo), el Id y EstadoContacto NO
 *   forman parte de este schema en absoluto: se construyen
 *   exclusivamente en el Service a partir del usuario autenticado
 *   (ver contacto.service.ts::crearContacto). Esto es intencional:
 *   ni siquiera existe la posibilidad de que Zod los "acepte pero
 *   ignore" — no están definidos, punto.
 *
 * NOTA — Nacionalidad (Fase 3, punto 12): este schema NO asigna
 * ningún valor por defecto a Nacionalidad. Si el cliente no la envía,
 * el Service la persiste como NULL. La eventual regla de negocio
 * "proponer 'PERUANO' para persona natural cuando corresponda" queda
 * deliberadamente SIN IMPLEMENTAR por ambigüedad no resuelta (no hay
 * evidencia documental de cuándo "corresponde" exactamente) — ver
 * informe de Fase 3, sección de puntos abiertos. No se inventa aquí.
 */

const TIPOS_CONTACTO = ["NATURAL", "JURIDICA"] as const;
const TIPOS_DOCUMENTO = ["DNI", "CE", "PASAPORTE", "RUC"] as const;
export const SEXOS = ["MASCULINO", "FEMENINO"] as const;

export type TipoContacto = (typeof TIPOS_CONTACTO)[number];
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/**
 * Formato de NumeroDocumento por TipoDocumento (Fase 3, punto 4).
 *
 * ⚠️ SUPUESTO DOCUMENTADO — no existe una especificación previa exacta
 * en el Word, en Fase 1 ni en Fase 1.1 sobre el formato exacto de cada
 * documento. Se aplican reglas razonables basadas en estándares
 * peruanos conocidos:
 *   - DNI:       8 dígitos numéricos.
 *   - RUC:       11 dígitos numéricos.
 *   - CE:        alfanumérico, 6 a 12 caracteres (no hay estándar
 *                único público para Carné de Extranjería).
 *   - PASAPORTE: alfanumérico, 5 a 15 caracteres (el formato varía
 *                según el país emisor).
 * Si el negocio define reglas distintas, deben reemplazarse aquí.
 */
// Fase Representantes: exportado (sin cambiar ninguna regla) para que
// representante.validator.ts pueda reutilizar el mismo formato de
// documento por tipo, sin duplicar los regex.
export const FORMATOS_DOCUMENTO: Record<TipoDocumento, RegExp> = {
  DNI: /^\d{8}$/,
  RUC: /^\d{11}$/,
  CE: /^[A-Za-z0-9]{6,12}$/,
  PASAPORTE: /^[A-Za-z0-9]{5,15}$/,
};

// ⚠️ SUPUESTO DOCUMENTADO — formato razonable de celular/teléfono fijo:
// dígitos, espacios, guiones y un "+" inicial opcional, 6 a 20
// caracteres (coincide con el límite de columna NVARCHAR(20)). No hay
// una especificación previa exacta.
export const TELEFONO_REGEX = /^[0-9+\-\s]{6,20}$/;

const contactoCreateBaseSchema = z
  .object({
    tipoContacto: z.enum(TIPOS_CONTACTO),
    tipoDocumento: z.enum(TIPOS_DOCUMENTO),
    numeroDocumento: z
      .string()
      .trim()
      .min(5, "Número de documento demasiado corto")
      .max(20, "Número de documento demasiado largo"),

    nombres: z.string().trim().min(1).max(120).optional(),
    apellidos: z.string().trim().min(1).max(120).optional(),
    razonSocial: z.string().trim().min(1).max(200).optional(),

    fechaNacimiento: z.string().date("Fecha de nacimiento inválida").optional(),
    sexo: z.enum(SEXOS).optional(),
    estadoCivil: z.string().trim().max(30).optional(),
    // Sin DEFAULT ni normalización automática — ver nota de Nacionalidad arriba.
    nacionalidad: z.string().trim().max(60).optional(),
    paisResidencia: z.string().trim().max(60).optional(),

    // Tamizaje AML básico (Fase 1.1, Decisión 5). Opcional en la
    // entrada; si no se envía, el Service la persiste en `false`
    // (coincide con el DEFAULT 0 de la columna).
    esPep: z.boolean().optional(),

    celular: z.string().trim().regex(TELEFONO_REGEX, "Celular inválido").optional(),
    correo: z.string().trim().max(150).email("Correo inválido").optional(),
    telefonoFijo: z.string().trim().regex(TELEFONO_REGEX, "Teléfono inválido").optional(),
  })
  .strict();

export const contactoCreateSchema = contactoCreateBaseSchema.superRefine((data, ctx) => {
  // Formato del documento según su tipo (independiente del cruce
  // NATURAL/JURIDICA de abajo, para dar un mensaje específico).
  const formato = FORMATOS_DOCUMENTO[data.tipoDocumento];
  if (!formato.test(data.numeroDocumento)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["numeroDocumento"],
      message: `Formato de ${data.tipoDocumento} inválido`,
    });
  }

  if (data.tipoContacto === "NATURAL") {
    if (!["DNI", "CE", "PASAPORTE"].includes(data.tipoDocumento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoDocumento"],
        message: "Persona natural requiere DNI, CE o PASAPORTE",
      });
    }
    if (!data.nombres) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nombres"],
        message: "Nombres es requerido para persona natural",
      });
    }
    if (!data.apellidos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apellidos"],
        message: "Apellidos es requerido para persona natural",
      });
    }
    if (data.razonSocial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["razonSocial"],
        message: "RazonSocial no aplica a persona natural",
      });
    }
  }

  if (data.tipoContacto === "JURIDICA") {
    if (data.tipoDocumento !== "RUC") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tipoDocumento"],
        message: "Persona jurídica requiere RUC",
      });
    }
    if (!data.razonSocial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["razonSocial"],
        message: "RazonSocial es requerido para persona jurídica",
      });
    }
    if (data.nombres) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nombres"],
        message: "Nombres no aplica a persona jurídica",
      });
    }
    if (data.apellidos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["apellidos"],
        message: "Apellidos no aplica a persona jurídica",
      });
    }
  }
});

export type ContactoCreateInput = z.infer<typeof contactoCreateBaseSchema>;

export function validateContactoCreate(body: unknown) {
  return contactoCreateSchema.safeParse(body);
}
