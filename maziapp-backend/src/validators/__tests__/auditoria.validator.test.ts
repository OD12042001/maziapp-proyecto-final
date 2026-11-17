import {
  identificadorBigintSchema,
  listarAuditoriaQuerySchema,
} from "../auditoria.validator";

describe("auditoria.validator (S40)", () => {
  test("aplica valores por defecto de paginación cuando no se envían filtros", () => {
    const parsed = listarAuditoriaQuerySchema.parse({});

    expect(parsed).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  test("acepta todos los filtros válidos de la bitácora", () => {
    const parsed = listarAuditoriaQuerySchema.parse({
      servicioCodigo: "S06",
      entidad: "Oportunidad",
      entidadId: "7",
      correlationId: "corr-12345678",
      usuarioId: "11111111-2222-3333-4444-555555555555",
      resultado: "EXITO",
      desde: "2026-11-01T00:00:00.000Z",
      hasta: "2026-11-16T23:59:59.000Z",
      page: "2",
      pageSize: "50",
    });

    expect(parsed.servicioCodigo).toBe("S06");
    expect(parsed.resultado).toBe("EXITO");
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(50);
    expect(parsed.desde).toBeInstanceOf(Date);
    expect(parsed.hasta).toBeInstanceOf(Date);
  });

  test("rechaza cuando desde es posterior a hasta", () => {
    const parsed = listarAuditoriaQuerySchema.safeParse({
      desde: "2026-11-16T12:00:00.000Z",
      hasta: "2026-11-15T12:00:00.000Z",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.flatten().fieldErrors.desde).toBeDefined();
    }
  });

  test("rechaza resultado inválido o usuarioId que no sea GUID", () => {
    expect(
      listarAuditoriaQuerySchema.safeParse({ resultado: "OTRO" }).success,
    ).toBe(false);
    expect(
      listarAuditoriaQuerySchema.safeParse({ usuarioId: "no-guid" }).success,
    ).toBe(false);
  });

  test("identificadorBigintSchema acepta solo cadenas numéricas de 1 a 18 dígitos", () => {
    expect(identificadorBigintSchema.safeParse("1").success).toBe(true);
    expect(identificadorBigintSchema.safeParse("9007199254740993").success).toBe(
      true,
    );
    expect(identificadorBigintSchema.safeParse("abc").success).toBe(false);
    expect(identificadorBigintSchema.safeParse("-1").success).toBe(false);
    expect(identificadorBigintSchema.safeParse("").success).toBe(false);
  });
});
