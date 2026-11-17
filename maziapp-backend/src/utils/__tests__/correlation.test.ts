import { obtenerCorrelationId } from "../correlation";

function reqConHeader(valor: string | null) {
  return {
    headers: {
      get: (nombre: string) => (nombre.toLowerCase() === "x-correlation-id" ? valor : null),
    },
  } as any;
}

describe("utils/correlation -> obtenerCorrelationId", () => {
  test("usa el header cuando es válido", () => {
    expect(obtenerCorrelationId(reqConHeader("abc-123:retry.1"), "fallback")).toBe(
      "abc-123:retry.1",
    );
  });

  test("recorta espacios alrededor del valor", () => {
    expect(obtenerCorrelationId(reqConHeader("  abc-123  "), "fallback")).toBe("abc-123");
  });

  test("cae al valor por defecto cuando no hay header", () => {
    expect(obtenerCorrelationId(reqConHeader(null), "fallback")).toBe("fallback");
    expect(obtenerCorrelationId(reqConHeader("   "), "fallback")).toBe("fallback");
  });

  test("rechaza valores que no caben en la columna (más de 64)", () => {
    expect(obtenerCorrelationId(reqConHeader("x".repeat(65)), "fallback")).toBe("fallback");
    expect(obtenerCorrelationId(reqConHeader("x".repeat(64)), "fallback")).toBe(
      "x".repeat(64),
    );
  });

  test("rechaza caracteres fuera del dominio permitido", () => {
    expect(obtenerCorrelationId(reqConHeader("abc 123"), "fallback")).toBe("fallback");
    expect(obtenerCorrelationId(reqConHeader("abc'; DROP TABLE x;--"), "fallback")).toBe(
      "fallback",
    );
    expect(obtenerCorrelationId(reqConHeader("abc/def"), "fallback")).toBe("fallback");
  });
});
