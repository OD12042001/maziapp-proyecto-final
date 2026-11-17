/**
 * Fase Actividad -- corrección de routing.
 *
 * OPTIONS /api/contactos/empresas -- Item C del fix: confirma que el
 * preflight dedicado responde 204 con los headers CORS correctos
 * (mismo criterio que el resto de preflights del proyecto), ahora que
 * dejó de depender de `corsPreflight.ts` (`contactos/{id?}` ->
 * `contactos/{id:int?}`, ver corsPreflight.ts).
 */
import { empresasCorsPreflight } from "../empresasCorsPreflight";

function buildRequest(origin: string | null) {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === "origin" ? origin : null),
    },
  } as any;
}

const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;

function headersOf(res: { headers?: unknown }): Record<string, string> {
  return (res.headers ?? {}) as Record<string, string>;
}

describe("empresasCorsPreflight (Function) -- OPTIONS /api/contactos/empresas", () => {
  const originalEnv = process.env.CORS_ALLOWED_ORIGINS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("204 sin body, con Vary: Origin siempre presente", async () => {
    const req = buildRequest(null);
    const res = await empresasCorsPreflight(req, context);

    expect(res.status).toBe(204);
    expect(headersOf(res)["Vary"]).toBe("Origin");
  });

  test("Origin permitido (allowlist explícita) -> refleja el origin y habilita GET/OPTIONS", async () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.maziflow.com";

    const req = buildRequest("https://app.maziflow.com");
    const res = await empresasCorsPreflight(req, context);

    expect(res.status).toBe(204);
    expect(headersOf(res)["Access-Control-Allow-Origin"]).toBe("https://app.maziflow.com");
    expect(headersOf(res)["Access-Control-Allow-Methods"]).toContain("GET");
    expect(headersOf(res)["Access-Control-Allow-Headers"]).toContain("Authorization");
  });

  test("Origin NO permitido -> no se agrega ningún header Access-Control-*", async () => {
    process.env.CORS_ALLOWED_ORIGINS = "https://app.maziflow.com";

    const req = buildRequest("https://evil.example.com");
    const res = await empresasCorsPreflight(req, context);

    expect(res.status).toBe(204);
    expect(headersOf(res)["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
