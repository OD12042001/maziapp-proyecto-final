/**
 * Fase Direcciones -- cobertura de ubigeo.validator.ts. Mismo criterio
 * que representante.validator.test.ts: no se prueba conectividad ni
 * base de datos, solo el resultado de Zod.
 */
import { validateBuscarDistritosQuery } from "../ubigeo.validator";

describe("ubigeo.validator", () => {
  test("search válido (>=2 caracteres) -> éxito", () => {
    const res = validateBuscarDistritosQuery({ search: "lima" });
    expect(res.success).toBe(true);
  });

  test("search de 1 caracter -> rechazado", () => {
    const res = validateBuscarDistritosQuery({ search: "l" });
    expect(res.success).toBe(false);
  });

  test("search vacío -> rechazado", () => {
    const res = validateBuscarDistritosQuery({ search: "" });
    expect(res.success).toBe(false);
  });

  test("search ausente -> rechazado (campo requerido)", () => {
    const res = validateBuscarDistritosQuery({});
    expect(res.success).toBe(false);
  });

  test("search demasiado largo (>100 caracteres) -> rechazado", () => {
    const res = validateBuscarDistritosQuery({ search: "a".repeat(101) });
    expect(res.success).toBe(false);
  });

  // Un intento de inyección SQL en el propio parámetro de búsqueda no
  // se rechaza aquí por su contenido (Zod solo valida longitud/tipo) --
  // pasa este validador como texto normal, y es la parametrización de
  // ubigeo.repository.ts la que garantiza que nunca se ejecuta como
  // SQL (ver ubigeo.repository.test.ts).
  test("search con sintaxis SQL maliciosa -> pasa el validador como texto (la protección real es la parametrización, no este validador)", () => {
    const res = validateBuscarDistritosQuery({ search: "lima'; DROP TABLE dbo.Distritos;--" });
    expect(res.success).toBe(true);
  });

  test("campo técnico no declarado (limit) -> rechazado por .strict()", () => {
    const res = validateBuscarDistritosQuery({ search: "lima", limit: 1000 });
    expect(res.success).toBe(false);
  });
});
