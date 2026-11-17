import { validateBuscarCiiuQuery } from "../ciiu.validator";

describe("validateBuscarCiiuQuery", () => {
  test("acepta search con 2+ caracteres", () => {
    expect(validateBuscarCiiuQuery({ search: "62" }).success).toBe(true);
  });

  test("rechaza search con menos de 2 caracteres", () => {
    expect(validateBuscarCiiuQuery({ search: "6" }).success).toBe(false);
  });

  test("rechaza search vacío", () => {
    expect(validateBuscarCiiuQuery({ search: "" }).success).toBe(false);
  });
});
