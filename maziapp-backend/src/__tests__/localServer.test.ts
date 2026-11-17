jest.mock("../utils/validateToken", () => ({ validateToken: jest.fn() }));

jest.mock("../config/sql", () => {
  const makeRequest = () => ({
    input() {
      return this;
    },
    async query() {
      return { recordset: [], rowsAffected: [1] };
    },
  });

  return {
    getPool: async () => ({
      request: makeRequest,
      transaction: () => ({
        begin: async () => undefined,
        commit: async () => undefined,
        rollback: async () => undefined,
        request: makeRequest,
      }),
    }),
    sql: {
      Int: "Int",
      BigInt: "BigInt",
      Bit: "Bit",
      DateTime2: "DateTime2",
      UniqueIdentifier: "UniqueIdentifier",
      Char: (n: number) => `Char(${n})`,
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      Decimal: () => "Decimal",
      MAX: "MAX",
    },
  };
});

import { AddressInfo } from "node:net";
import { createLocalServer } from "../localServer";

describe("localServer (wrapper HTTP + Swagger UI)", () => {
  const server = createLocalServer();
  let baseUrl = "";

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test("expone Swagger UI en GET /api/docs y el contrato en GET /api/openapi.yaml", async () => {
    const docsRes = await fetch(`${baseUrl}/api/docs`);
    expect(docsRes.status).toBe(200);
    expect(await docsRes.text()).toContain("SwaggerUIBundle");

    const yamlRes = await fetch(`${baseUrl}/api/openapi.yaml`);
    expect(yamlRes.status).toBe(200);
    expect(await yamlRes.text()).toContain("openapi: 3.1.0");
  });

  test("enruta peticiones a los handlers de Azure Functions y devuelve X-Correlation-Id", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/etapas`, {
      headers: { "X-Correlation-Id": "corr-local-server-01" },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-correlation-id")).toBe("corr-local-server-01");
    expect(await res.json()).toEqual([]);

    const preflight = await fetch(`${baseUrl}/api/cierres`, {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:4200" },
    });
    expect(preflight.status).toBe(204);

    const notFound = await fetch(`${baseUrl}/api/ruta-inexistente`);
    expect(notFound.status).toBe(404);
  });
});
