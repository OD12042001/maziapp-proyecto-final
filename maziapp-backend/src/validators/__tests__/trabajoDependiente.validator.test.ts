/**
 * Fase Actividad -- Zod schema del modal "Trabajo dependiente".
 *
 * Cubre: Empresa como XOR (empresaContactoId O empresaNombreLibre,
 * nunca ambas ni ninguna), fechas (Hasta no anterior a Desde), y
 * `.strict()` rechazando campos técnicos (id, contactoId, creado*).
 */
import { trabajoDependienteSchema } from "../trabajoDependiente.validator";

const base = {
  cargo: "Analista",
  desde: "2020-01-01",
};

describe("trabajoDependienteSchema", () => {
  test("acepta empresaContactoId solo (sin empresaNombreLibre)", () => {
    const res = trabajoDependienteSchema.safeParse({ ...base, empresaContactoId: 5 });
    expect(res.success).toBe(true);
  });

  test("acepta empresaNombreLibre solo (sin empresaContactoId)", () => {
    const res = trabajoDependienteSchema.safeParse({ ...base, empresaNombreLibre: "Acme SAC" });
    expect(res.success).toBe(true);
  });

  test("rechaza cuando faltan AMBOS campos de empresa", () => {
    const res = trabajoDependienteSchema.safeParse({ ...base });
    expect(res.success).toBe(false);
  });

  test("rechaza cuando llegan AMBOS campos de empresa a la vez", () => {
    const res = trabajoDependienteSchema.safeParse({
      ...base,
      empresaContactoId: 5,
      empresaNombreLibre: "Acme SAC",
    });
    expect(res.success).toBe(false);
  });

  test("rechaza cargo vacío", () => {
    const res = trabajoDependienteSchema.safeParse({
      empresaNombreLibre: "Acme SAC",
      cargo: "",
      desde: "2020-01-01",
    });
    expect(res.success).toBe(false);
  });

  test("rechaza desde con formato inválido", () => {
    const res = trabajoDependienteSchema.safeParse({
      empresaNombreLibre: "Acme SAC",
      cargo: "Analista",
      desde: "01/01/2020",
    });
    expect(res.success).toBe(false);
  });

  test("acepta hasta ausente (trabajo vigente)", () => {
    const res = trabajoDependienteSchema.safeParse({ ...base, empresaNombreLibre: "Acme SAC" });
    expect(res.success).toBe(true);
  });

  test("rechaza hasta anterior a desde", () => {
    const res = trabajoDependienteSchema.safeParse({
      empresaNombreLibre: "Acme SAC",
      cargo: "Analista",
      desde: "2022-01-01",
      hasta: "2021-01-01",
    });
    expect(res.success).toBe(false);
  });

  test("acepta hasta posterior a desde", () => {
    const res = trabajoDependienteSchema.safeParse({
      empresaNombreLibre: "Acme SAC",
      cargo: "Analista",
      desde: "2020-01-01",
      hasta: "2021-01-01",
    });
    expect(res.success).toBe(true);
  });

  test("rechaza campos técnicos no previstos (.strict())", () => {
    const res = trabajoDependienteSchema.safeParse({
      ...base,
      empresaNombreLibre: "Acme SAC",
      id: "999",
      contactoId: "10",
    });
    expect(res.success).toBe(false);
  });
});
