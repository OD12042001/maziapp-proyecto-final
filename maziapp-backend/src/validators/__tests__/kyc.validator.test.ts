/**
 * Contratos de entrada del módulo KYC (S12/S13), derivados de
 * docs/openapi.yaml. Se prueba la forma y las reglas que el contrato
 * declara: rechazo con observación obligatoria, estados permitidos y
 * parámetros de paginación.
 */
import {
  crearExpedienteSchema,
  registrarRecepcionSchema,
  revisarDocumentoSchema,
  dictamenSchema,
  listarExpedientesQuerySchema,
  ESTADOS_EXPEDIENTE_KYC,
} from "../kyc.validator";

function issues(result: any): string[] {
  return result.error.issues.map((issue: any) => issue.path.join("."));
}

describe("crearExpedienteSchema", () => {
  test("acepta una oportunidad válida", () => {
    expect(
      crearExpedienteSchema.safeParse({ oportunidadId: 12 }).success,
    ).toBe(true);
  });

  test("rechaza ids no positivos", () => {
    expect(crearExpedienteSchema.safeParse({ oportunidadId: 0 }).success).toBe(
      false,
    );
    expect(
      crearExpedienteSchema.safeParse({ oportunidadId: -3 }).success,
    ).toBe(false);
  });

  test("rechaza propiedades desconocidas", () => {
    const parsed = crearExpedienteSchema.safeParse({
      oportunidadId: 1,
      forzar: true,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("registrarRecepcionSchema", () => {
  test("acepta código, referencia y observación opcional", () => {
    expect(
      registrarRecepcionSchema.safeParse({
        documentoRequeridoCodigo: "DOC_IDENTIDAD",
        archivoReferencia: "https://docs.local/doc-1.pdf",
      }).success,
    ).toBe(true);
  });

  test("exige referencia de archivo no vacía", () => {
    const parsed = registrarRecepcionSchema.safeParse({
      documentoRequeridoCodigo: "DOC_IDENTIDAD",
      archivoReferencia: "",
    });

    expect(parsed.success).toBe(false);
    expect(issues(parsed)).toContain("archivoReferencia");
  });

  test("rechaza referencias mayores a 500 caracteres", () => {
    const parsed = registrarRecepcionSchema.safeParse({
      documentoRequeridoCodigo: "DOC_IDENTIDAD",
      archivoReferencia: "x".repeat(501),
    });

    expect(parsed.success).toBe(false);
    expect(issues(parsed)).toContain("archivoReferencia");
  });
});

describe("revisarDocumentoSchema", () => {
  test("exige observación cuando el documento se rechaza", () => {
    const parsed = revisarDocumentoSchema.safeParse({ estado: "RECHAZADO" });

    expect(parsed.success).toBe(false);
    expect(issues(parsed)).toContain("observacion");
  });

  test("acepta la validación sin observación", () => {
    expect(
      revisarDocumentoSchema.safeParse({ estado: "VALIDADO" }).success,
    ).toBe(true);
  });

  test("no admite PENDIENTE como destino de revisión", () => {
    const parsed = revisarDocumentoSchema.safeParse({ estado: "PENDIENTE" });

    expect(parsed.success).toBe(false);
    expect(issues(parsed)).toContain("estado");
  });
});

describe("dictamenSchema", () => {
  test("exige observación cuando el expediente se rechaza", () => {
    const parsed = dictamenSchema.safeParse({ estado: "RECHAZADO" });

    expect(parsed.success).toBe(false);
    expect(issues(parsed)).toContain("observacion");
  });

  test("acepta la validación sin observación", () => {
    expect(dictamenSchema.safeParse({ estado: "VALIDADO" }).success).toBe(true);
  });

  test("solo admite dictamen final", () => {
    for (const estado of ["PENDIENTE", "EN_PROCESO", "RECIBIDO"]) {
      expect(dictamenSchema.safeParse({ estado }).success).toBe(false);
    }
  });
});

describe("listarExpedientesQuerySchema", () => {
  test("aplica la paginación por defecto", () => {
    const parsed = listarExpedientesQuerySchema.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(20);
  });

  test("convierte los filtros que llegan como texto", () => {
    const parsed = listarExpedientesQuerySchema.parse({
      estado: "EN_PROCESO",
      contactoId: "20",
      oportunidadId: "7",
      page: "2",
      pageSize: "50",
    });

    expect(parsed).toEqual({
      estado: "EN_PROCESO",
      contactoId: 20,
      oportunidadId: 7,
      page: 2,
      pageSize: 50,
    });
  });

  test("rechaza un estado fuera del contrato", () => {
    expect(
      listarExpedientesQuerySchema.safeParse({ estado: "APROBADO" }).success,
    ).toBe(false);
  });

  test("rechaza pageSize mayor a 100", () => {
    expect(
      listarExpedientesQuerySchema.safeParse({ pageSize: "101" }).success,
    ).toBe(false);
  });
});

describe("catálogo de estados", () => {
  test("coincide con el CHECK de dbo.KycExpedientes", () => {
    expect([...ESTADOS_EXPEDIENTE_KYC]).toEqual([
      "PENDIENTE",
      "EN_PROCESO",
      "VALIDADO",
      "RECHAZADO",
    ]);
  });
});
