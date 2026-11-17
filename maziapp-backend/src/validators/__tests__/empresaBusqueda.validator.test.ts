import { validateBuscarEmpresasQuery } from "../empresaBusqueda.validator";

describe("validateBuscarEmpresasQuery", () => {
  test("acepta search con 2+ caracteres", () => {
    expect(validateBuscarEmpresasQuery({ search: "ac" }).success).toBe(true);
  });

  test("rechaza search con menos de 2 caracteres", () => {
    expect(validateBuscarEmpresasQuery({ search: "a" }).success).toBe(false);
  });

  test("rechaza search vacío", () => {
    expect(validateBuscarEmpresasQuery({ search: "" }).success).toBe(false);
  });

  test("rechaza campos técnicos no previstos (.strict())", () => {
    expect(validateBuscarEmpresasQuery({ search: "acme", responsableId: "x" }).success).toBe(false);
  });
});
