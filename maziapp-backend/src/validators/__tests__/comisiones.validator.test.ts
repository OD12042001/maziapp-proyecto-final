import {
  listarComisionesQuerySchema,
  revertirComisionSchema,
} from "../comisiones.validator";

describe("comisiones.validator (S16/S17)", () => {
  test("listarComisionesQuerySchema valida filtros y rango de fechas", () => {
    expect(listarComisionesQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });

    expect(
      listarComisionesQuerySchema.safeParse({
        desde: "2026-11-20",
        hasta: "2026-11-10",
      }).success,
    ).toBe(false);
  });

  test("revertirComisionSchema valida motivos permitidos y fechaEvaluacionUtc", () => {
    const parsed = revertirComisionSchema.parse({
      motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
      motivoDetalle: "Inversionista desistió",
      estadoKyc: "VALIDADO",
      estadoDesembolso: "FALLIDO",
      fechaEvaluacionUtc: "2026-11-16T18:00:00.000Z",
      observacion: "Evidencia adjunta",
    });

    expect(parsed.motivoCodigo).toBe("DESEMBOLSO_NO_CONCRETADO");
    expect(parsed.fechaEvaluacionUtc).toBeInstanceOf(Date);

    expect(
      revertirComisionSchema.safeParse({
        motivoCodigo: "OTRO_MOTIVO",
        fechaEvaluacionUtc: "2026-11-16T18:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
