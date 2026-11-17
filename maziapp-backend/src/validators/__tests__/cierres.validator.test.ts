import {
  listarCierresQuerySchema,
  registrarCierreSchema,
} from "../cierres.validator";

describe("cierres.validator (S15)", () => {
  test("registrarCierreSchema valida un cierre válido y rechaza montos <= 0 o campos extra", () => {
    const parsed = registrarCierreSchema.parse({
      oportunidadId: 7,
      proyectoId: 1,
      montoCaptado: 200000,
      monedaCodigo: "PEN",
      fechaCierreUtc: "2026-11-16T15:00:00.000Z",
    });

    expect(parsed.oportunidadId).toBe(7);
    expect(parsed.fechaCierreUtc).toBeInstanceOf(Date);

    expect(
      registrarCierreSchema.safeParse({
        oportunidadId: 7,
        proyectoId: 1,
        montoCaptado: 0,
        monedaCodigo: "PEN",
        fechaCierreUtc: "2026-11-16T15:00:00.000Z",
      }).success,
    ).toBe(false);

    expect(
      registrarCierreSchema.safeParse({
        oportunidadId: 7,
        proyectoId: 1,
        montoCaptado: 1000,
        monedaCodigo: "PEN",
        fechaCierreUtc: "2026-11-16T15:00:00.000Z",
        extra: true,
      }).success,
    ).toBe(false);
  });

  test("listarCierresQuerySchema valida paginación, filtros y rango de fechas", () => {
    expect(listarCierresQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });

    const bad = listarCierresQuerySchema.safeParse({
      desde: "2026-11-17",
      hasta: "2026-11-15",
    });
    expect(bad.success).toBe(false);
  });
});
