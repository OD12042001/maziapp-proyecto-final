import {
  identificadorBigintSchema,
  listarOutboxFallidosQuerySchema,
  listarOutboxQuerySchema,
  procesarOutboxSchema,
} from "../esb.validator";

describe("esb.validator", () => {
  test("listarOutboxQuerySchema aplica paginación por defecto y valida estado", () => {
    expect(listarOutboxQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });

    expect(
      listarOutboxQuerySchema.parse({
        estado: "PENDIENTE",
        tipoEvento: "EtapaCambiada",
        page: "3",
        pageSize: "10",
      }),
    ).toEqual({
      estado: "PENDIENTE",
      tipoEvento: "EtapaCambiada",
      page: 3,
      pageSize: 10,
    });

    expect(
      listarOutboxQuerySchema.safeParse({ estado: "DESCONOCIDO" }).success,
    ).toBe(false);
  });

  test("listarOutboxFallidosQuerySchema valida paginación y rechaza campos extra", () => {
    expect(listarOutboxFallidosQuerySchema.parse({ page: "1", pageSize: "25" })).toEqual({
      page: 1,
      pageSize: 25,
    });
    expect(
      listarOutboxFallidosQuerySchema.safeParse({ estado: "MUERTO" }).success,
    ).toBe(false);
  });

  test("procesarOutboxSchema usa limite=20 por defecto y exige entero en 1..100", () => {
    expect(procesarOutboxSchema.parse({})).toEqual({ limite: 20 });
    expect(procesarOutboxSchema.parse({ limite: 50 })).toEqual({ limite: 50 });
    expect(procesarOutboxSchema.safeParse({ limite: 0 }).success).toBe(false);
    expect(procesarOutboxSchema.safeParse({ limite: 101 }).success).toBe(false);
    expect(procesarOutboxSchema.safeParse({ extra: true }).success).toBe(false);
  });

  test("reexporta identificadorBigintSchema", () => {
    expect(identificadorBigintSchema.safeParse("42").success).toBe(true);
  });
});
