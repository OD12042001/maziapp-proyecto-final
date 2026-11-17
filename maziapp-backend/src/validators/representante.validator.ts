import { z } from "zod";

import { FORMATOS_DOCUMENTO, TELEFONO_REGEX } from "./contacto.validator";

/**
 * Validacion de entrada para alta de Representantes (Fase
 * Representantes) -- POST /api/contactos/{contactoId}/representantes.
 *
 * Reutiliza de contacto.validator.ts (sin duplicar ni modificar):
 * - FORMATOS_DOCUMENTO: mismos regex de formato por tipo de documento
 *   (exportado en ese archivo unicamente para este reuso).
 * - TELEFONO_REGEX: mismo regex de celular que ya usa
 *   contacto.validator.ts / contactoUpdate.validator.ts.
 *
 * Un representante es SIEMPRE persona natural: TipoDocumento se limita
 * a DNI/CE/PASAPORTE -- RUC no es un tipo de documento valido aqui (a
 * diferencia de contacto.validator.ts, que si admite RUC para
 * TipoContacto = 'JURIDICA'). Intentar enviar "RUC" falla directamente
 * en z.enum(), antes de llegar a ningun superRefine.
 *
 * `.strict()`: cualquier propiedad no declarada aqui (por ejemplo
 * "representanteId", "contactoId", "activo" o cualquier campo de
 * auditoria) hace que TODO el parseo falle con 400 -- mismo criterio
 * de seguridad que contacto.validator.ts / contactoUpdate.validator.ts.
 * Los campos de auditoria (CreadoId/CreadoNombre/CreadoCorreo/...) NO
 * forman parte de este schema: se construyen exclusivamente en
 * representante.service.ts a partir del usuario autenticado, igual
 * que en contacto.service.ts::crearContacto.
 *
 * Cargo pertenece a la RELACION (dbo.ContactoRepresentante), no a la
 * persona (dbo.Representantes) -- pero viaja en este mismo payload de
 * alta porque el alta siempre crea/reutiliza la persona Y crea/
 * reactiva la relacion en una sola operacion (ver
 * representante.service.ts::crearRepresentante).
 */
const TIPOS_DOCUMENTO_REPRESENTANTE = ["DNI", "CE", "PASAPORTE"] as const;

export type TipoDocumentoRepresentante = (typeof TIPOS_DOCUMENTO_REPRESENTANTE)[number];

const representanteCreateBaseSchema = z
  .object({
    tipoDocumento: z.enum(TIPOS_DOCUMENTO_REPRESENTANTE),
    // 🐛 CORRECCIÓN (preexistente, ajena a la Fase Edición): antes este
    // campo tenía además `.min(5, "Número de documento demasiado
    // corto").max(20, "Número de documento demasiado largo")`. Como
    // FORMATOS_DOCUMENTO (contacto.validator.ts) ya exige una longitud
    // exacta/acotada por tipo -- DNI 8 dígitos, CE 6-12, PASAPORTE
    // 5-15, ambos vía regex -- ese `.min/.max` genérico era redundante
    // Y además "ganaba" sobre el mensaje de `superRefine` de abajo para
    // documentos muy cortos (p.ej. DNI "123"): Zod agrega AMBOS issues
    // en el mismo `numeroDocumento`, y el primero en el arreglo
    // (`.min()`, evaluado antes que `superRefine`) es el que
    // typicamente se muestra/lee primero, dejando "Número de documento
    // demasiado corto" en vez de "Formato de DNI inválido" -- detectado
    // por representante.validator.test.ts. Se elimina el `.min/.max`
    // genérico: la validación de longitud/formato exacta por tipo de
    // documento queda exclusivamente en el `superRefine` de abajo, sin
    // perder cobertura (el regex de cada tipo ya la exige).
    numeroDocumento: z.string().trim(),

    nombres: z.string().trim().min(1, "Nombres es requerido").max(120),
    apellidos: z.string().trim().min(1, "Apellidos es requerido").max(120),
    cargo: z.string().trim().min(2, "Cargo es requerido").max(100),

    celular: z.string().trim().regex(TELEFONO_REGEX, "Celular inválido").optional(),
    correo: z.string().trim().max(150).email("Correo inválido").optional(),
  })
  .strict();

export const representanteCreateSchema = representanteCreateBaseSchema.superRefine(
  (data, ctx) => {
    const formato = FORMATOS_DOCUMENTO[data.tipoDocumento];

    if (!formato.test(data.numeroDocumento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeroDocumento"],
        message: `Formato de ${data.tipoDocumento} inválido`,
      });
    }
  },
);

export type RepresentanteCreateInput = z.infer<typeof representanteCreateBaseSchema>;

export function validateRepresentanteCreate(body: unknown) {
  return representanteCreateSchema.safeParse(body);
}

/**
 * Validación de entrada para EDICIÓN de un representante ya asociado a
 * una empresa -- PATCH /api/contactos/{contactoId}/representantes/{representanteId}
 * (endpoint nuevo, ver representante.service.ts::actualizarRepresentante).
 *
 * Deliberadamente NO incluye `tipoDocumento`/`numeroDocumento`: esos
 * campos son la llave de identidad (UQ_Representantes_TipoDocumento_
 * NumeroDocumento) que decide si una alta REUTILIZA o CREA una persona
 * -- permitir editarlos aquí podría, sin querer, hacer que un
 * RepresentanteId existente pase a representar el documento de otra
 * persona, o colisionar con un representante distinto ya registrado
 * con ese documento. Esa es una operación de otro alcance (fusionar/
 * reidentificar personas), no la pedida en esta fase ("editar los
 * datos del representante"); el Frontend mantiene esos dos campos de
 * solo lectura en el modal de edición.
 *
 * SÍ incluye `cargo`: aunque vive en dbo.ContactoRepresentante (la
 * relación, no la persona), el modal de edición es un único formulario
 * -- igual que crearRepresentante actualiza persona + relación en una
 * sola llamada, actualizarRepresentante hace lo mismo para edición
 * (ver representante.service.ts).
 *
 * `.strict()`: mismo criterio que representanteCreateSchema -- rechaza
 * con 400 cualquier campo no declarado (incluyendo un intento de
 * enviar tipoDocumento/numeroDocumento/representanteId/activo/etc.).
 */
const representanteUpdateBaseSchema = z
  .object({
    nombres: z.string().trim().min(1, "Nombres es requerido").max(120),
    apellidos: z.string().trim().min(1, "Apellidos es requerido").max(120),
    cargo: z.string().trim().min(2, "Cargo es requerido").max(100),

    celular: z.string().trim().regex(TELEFONO_REGEX, "Celular inválido").optional(),
    correo: z.string().trim().max(150).email("Correo inválido").optional(),
  })
  .strict();

export type RepresentanteUpdateInput = z.infer<typeof representanteUpdateBaseSchema>;

export function validateRepresentanteUpdate(body: unknown) {
  return representanteUpdateBaseSchema.safeParse(body);
}
