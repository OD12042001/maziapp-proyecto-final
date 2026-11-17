/**
 * Fase Representantes -- cobertura de representante.validator.ts.
 * Mismo criterio que contacto.validator.test.ts: no se prueba
 * conectividad ni base de datos, solo el resultado de Zod.
 */
import { validateRepresentanteCreate, validateRepresentanteUpdate } from "../representante.validator";

const base = {
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombres: "Juan",
  apellidos: "Pérez",
  cargo: "Gerente General",
};

describe("representante.validator", () => {
  test("DNI válido -> éxito", () => {
    const res = validateRepresentanteCreate(base);
    expect(res.success).toBe(true);
  });

  test("CE válido -> éxito", () => {
    const res = validateRepresentanteCreate({
      ...base,
      tipoDocumento: "CE",
      numeroDocumento: "ABC1234",
    });
    expect(res.success).toBe(true);
  });

  test("PASAPORTE válido -> éxito", () => {
    const res = validateRepresentanteCreate({
      ...base,
      tipoDocumento: "PASAPORTE",
      numeroDocumento: "AB12345",
    });
    expect(res.success).toBe(true);
  });

  test("RUC rechazado -- un representante nunca puede tener RUC", () => {
    const res = validateRepresentanteCreate({
      ...base,
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
    });
    expect(res.success).toBe(false);
  });

  test("DNI con formato inválido (menos de 8 dígitos) -> rechazado con mensaje específico", () => {
    const res = validateRepresentanteCreate({ ...base, numeroDocumento: "123" });
    expect(res.success).toBe(false);
    if (!res.success) {
      const issue = res.error.issues.find((i) => i.path[0] === "numeroDocumento");
      expect(issue?.message).toBe("Formato de DNI inválido");
    }
  });

  test("nombres vacío -> rechazado", () => {
    const res = validateRepresentanteCreate({ ...base, nombres: "" });
    expect(res.success).toBe(false);
  });

  test("apellidos vacío -> rechazado", () => {
    const res = validateRepresentanteCreate({ ...base, apellidos: "" });
    expect(res.success).toBe(false);
  });

  test("cargo vacío -> rechazado", () => {
    const res = validateRepresentanteCreate({ ...base, cargo: "" });
    expect(res.success).toBe(false);
  });

  test("cargo ausente -> rechazado (campo requerido)", () => {
    const { cargo, ...sinCargo } = base;
    const res = validateRepresentanteCreate(sinCargo);
    expect(res.success).toBe(false);
  });

  test("celular con formato inválido -> rechazado", () => {
    const res = validateRepresentanteCreate({ ...base, celular: "abc" });
    expect(res.success).toBe(false);
  });

  test("celular ausente -> éxito (opcional)", () => {
    const res = validateRepresentanteCreate(base);
    expect(res.success).toBe(true);
  });

  test("correo con formato inválido -> rechazado", () => {
    const res = validateRepresentanteCreate({ ...base, correo: "no-es-un-correo" });
    expect(res.success).toBe(false);
  });

  test("correo válido -> éxito", () => {
    const res = validateRepresentanteCreate({ ...base, correo: "juan@example.com" });
    expect(res.success).toBe(true);
  });

  test("campo técnico no declarado (representanteId) -> rechazado por .strict()", () => {
    const res = validateRepresentanteCreate({ ...base, representanteId: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (contactoId) -> rechazado por .strict()", () => {
    const res = validateRepresentanteCreate({ ...base, contactoId: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (activo) -> rechazado por .strict()", () => {
    const res = validateRepresentanteCreate({ ...base, activo: true });
    expect(res.success).toBe(false);
  });
});

/**
 * Fase Representantes (Edición) -- cobertura de
 * validateRepresentanteUpdate. Mismo criterio de arriba: solo Zod, sin
 * BD. Cubre explícitamente que tipoDocumento/numeroDocumento NO son
 * parte del contrato de edición (a diferencia de validateRepresentanteCreate).
 */
describe("representante.validator -- validateRepresentanteUpdate", () => {
  const baseUpdate = {
    nombres: "Juan",
    apellidos: "Pérez",
    cargo: "Gerente General",
  };

  test("payload mínimo válido (sin celular/correo) -> éxito", () => {
    const res = validateRepresentanteUpdate(baseUpdate);
    expect(res.success).toBe(true);
  });

  test("con celular y correo válidos -> éxito", () => {
    const res = validateRepresentanteUpdate({
      ...baseUpdate,
      celular: "999888777",
      correo: "juan@example.com",
    });
    expect(res.success).toBe(true);
  });

  test("nombres vacío -> rechazado", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, nombres: "" });
    expect(res.success).toBe(false);
  });

  test("apellidos vacío -> rechazado", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, apellidos: "" });
    expect(res.success).toBe(false);
  });

  test("cargo vacío -> rechazado", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, cargo: "" });
    expect(res.success).toBe(false);
  });

  test("cargo ausente -> rechazado (campo requerido)", () => {
    const { cargo, ...sinCargo } = baseUpdate;
    const res = validateRepresentanteUpdate(sinCargo);
    expect(res.success).toBe(false);
  });

  test("celular con formato inválido -> rechazado", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, celular: "abc" });
    expect(res.success).toBe(false);
  });

  test("correo con formato inválido -> rechazado", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, correo: "no-es-un-correo" });
    expect(res.success).toBe(false);
  });

  // 🔐 CRÍTICO (decisión de diseño de esta fase, ver
  // representante.validator.ts): tipoDocumento/numeroDocumento son la
  // llave de identidad de la persona -- este endpoint de edición NUNCA
  // los admite, ni siquiera con un valor idéntico al ya persistido.
  test("tipoDocumento presente -> rechazado por .strict() (de solo lectura al editar)", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, tipoDocumento: "DNI" });
    expect(res.success).toBe(false);
  });

  test("numeroDocumento presente -> rechazado por .strict() (de solo lectura al editar)", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, numeroDocumento: "12345678" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (representanteId) -> rechazado por .strict()", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, representanteId: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (contactoRepresentanteId) -> rechazado por .strict()", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, contactoRepresentanteId: "1" });
    expect(res.success).toBe(false);
  });

  test("campo técnico no declarado (activo) -> rechazado por .strict()", () => {
    const res = validateRepresentanteUpdate({ ...baseUpdate, activo: true });
    expect(res.success).toBe(false);
  });
});
