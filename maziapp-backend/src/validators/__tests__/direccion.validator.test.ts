/**
 * Fase Direcciones -- cobertura de direccion.validator.ts. Mismo
 * criterio que representante.validator.test.ts: no se prueba
 * conectividad ni base de datos, solo el resultado de Zod.
 */
import { validateDireccionCreate, validateDireccionUpdate } from "../direccion.validator";

const base = {
  idDistrito: 1501,
  calle: "Av. Javier Prado Este",
  numero: "1234",
};

describe("direccion.validator -> validateDireccionCreate", () => {
  test("payload válido (sin departamentoInterior) -> éxito", () => {
    const res = validateDireccionCreate(base);
    expect(res.success).toBe(true);
  });

  test("payload válido con departamentoInterior -> éxito", () => {
    const res = validateDireccionCreate({ ...base, departamentoInterior: "Dpto 402" });
    expect(res.success).toBe(true);
  });

  test("idDistrito ausente -> rechazado (campo requerido)", () => {
    const { idDistrito, ...sinDistrito } = base;
    const res = validateDireccionCreate(sinDistrito);
    expect(res.success).toBe(false);
  });

  test("idDistrito como texto (no seleccionado desde el autocompletado) -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, idDistrito: "Miraflores" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "idDistrito");
      expect(issue?.message).toBe("Selecciona un distrito válido");
    }
  });

  test("idDistrito negativo o cero -> rechazado", () => {
    expect(validateDireccionCreate({ ...base, idDistrito: 0 }).success).toBe(false);
    expect(validateDireccionCreate({ ...base, idDistrito: -5 }).success).toBe(false);
  });

  test("idDistrito no entero -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, idDistrito: 1.5 });
    expect(res.success).toBe(false);
  });

  test("calle vacía -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, calle: "" });
    expect(res.success).toBe(false);
  });

  test("calle ausente -> rechazado (campo requerido)", () => {
    const { calle, ...sinCalle } = base;
    const res = validateDireccionCreate(sinCalle);
    expect(res.success).toBe(false);
  });

  test("calle demasiado larga (>250 caracteres) -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, calle: "a".repeat(251) });
    expect(res.success).toBe(false);
  });

  test("numero vacío -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, numero: "" });
    expect(res.success).toBe(false);
  });

  test("numero ausente -> rechazado (campo requerido)", () => {
    const { numero, ...sinNumero } = base;
    const res = validateDireccionCreate(sinNumero);
    expect(res.success).toBe(false);
  });

  test("numero demasiado largo (>30 caracteres) -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, numero: "1".repeat(31) });
    expect(res.success).toBe(false);
  });

  test("departamentoInterior demasiado largo (>100 caracteres) -> rechazado", () => {
    const res = validateDireccionCreate({ ...base, departamentoInterior: "a".repeat(101) });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (idDireccion) -> rechazado por .strict()", () => {
    const res = validateDireccionCreate({ ...base, idDireccion: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (idContacto) -> rechazado por .strict()", () => {
    const res = validateDireccionCreate({ ...base, idContacto: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (activo) -> rechazado por .strict()", () => {
    const res = validateDireccionCreate({ ...base, activo: true });
    expect(res.success).toBe(false);
  });

  test("intento de SQL en calle/numero -> pasa el validador como texto (la protección real es la parametrización del repository)", () => {
    const res = validateDireccionCreate({
      ...base,
      calle: "Av. Test'; DROP TABLE dbo.Direcciones;--",
    });
    expect(res.success).toBe(true);
  });
});

describe("direccion.validator -> validateDireccionUpdate", () => {
  test("mismas reglas que la creación -- payload válido -> éxito", () => {
    const res = validateDireccionUpdate(base);
    expect(res.success).toBe(true);
  });

  test("idDistrito inválido -> rechazado", () => {
    const res = validateDireccionUpdate({ ...base, idDistrito: null });
    expect(res.success).toBe(false);
  });
});
