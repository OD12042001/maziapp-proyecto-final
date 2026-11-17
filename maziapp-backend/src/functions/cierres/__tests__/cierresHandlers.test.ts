jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth:
    (_roles: string[], handler: any) =>
    (req: any, ctx: any, user?: any) =>
      handler(req, ctx, user ?? {
        oid: "11111111-2222-3333-4444-555555555555",
        name: "Freelance",
        roles: ["ejecutivo_inversion"],
      }),
}));

jest.mock("../../../services/cierres/cierres.service", () => ({
  listarCierres: jest.fn(),
  obtenerCierre: jest.fn(),
  registrarCierre: jest.fn(),
  CierreDuplicadoError: class extends Error {},
  CierreOportunidadNoValidaError: class extends Error {},
  CierreKycNoValidadoError: class extends Error {},
  CierreProyectoInvalidoError: class extends Error {},
  CierreMonedaInvalidaError: class extends Error {},
}));

jest.mock("../../../services/idempotencia/idempotencia.service", () => {
  const actual = jest.requireActual(
    "../../../services/idempotencia/idempotencia.service",
  );
  return {
    ...actual,
    ejecutarIdempotente: jest.fn(async (_sol: unknown, op: () => Promise<any>) => {
      const r = await op();
      return { ...r, reutilizada: false };
    }),
  };
});

import * as svc from "../../../services/cierres/cierres.service";
import * as idem from "../../../services/idempotencia/idempotencia.service";
import { createCierre } from "../createCierre";
import { getCierre } from "../getCierre";
import { getCierres } from "../getCierres";

const USER = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Freelance",
  roles: ["ejecutivo_inversion"],
};

const context: any = {
  invocationId: "inv-cierre-1",
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function req(
  o: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): any {
  return {
    method: o.method ?? "GET",
    params: o.params ?? {},
    query: new URLSearchParams(o.query ?? {}),
    headers: new Headers(o.headers ?? {}),
    json: async () => {
      if (o.body === undefined) throw new SyntaxError("empty");
      return o.body;
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cierres handlers (S15)", () => {
  test("POST /cierres exige Idempotency-Key (400), traduce 422 y 409, y devuelve 201", async () => {
    const sinClave = await (createCierre as any)(
      req({ method: "POST", body: {} }),
      context,
      USER,
    );
    expect(sinClave.status).toBe(400);

    const cuerpoValido = {
      oportunidadId: 7,
      proyectoId: 1,
      montoCaptado: 200000,
      monedaCodigo: "PEN",
      fechaCierreUtc: "2026-11-16T15:00:00.000Z",
    };

    (svc.registrarCierre as jest.Mock).mockResolvedValueOnce({
      cierreId: 10,
      oportunidadId: 7,
    });
    const ok = await (createCierre as any)(
      req({
        method: "POST",
        headers: {
          "idempotency-key": "idem-cierre-001",
          "x-correlation-id": "corr-cierre-1",
        },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(ok.status).toBe(201);
    expect(ok.headers["X-Correlation-Id"]).toBe("corr-cierre-1");

    (svc.registrarCierre as jest.Mock).mockRejectedValueOnce(
      new svc.CierreKycNoValidadoError("KYC no validado"),
    );
    const conflict = await (createCierre as any)(
      req({
        method: "POST",
        headers: { "idempotency-key": "idem-cierre-002" },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(conflict.status).toBe(409);

    (idem.ejecutarIdempotente as jest.Mock).mockRejectedValueOnce(
      new idem.IdempotenciaCuerpoDistintoError("Cuerpo distinto"),
    );
    const unproc = await (createCierre as any)(
      req({
        method: "POST",
        headers: { "idempotency-key": "idem-cierre-001" },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(unproc.status).toBe(422);
  });

  test("GET /cierres y GET /cierres/{id} responden 200, 400 y 404", async () => {
    (svc.listarCierres as jest.Mock).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const listOk = await (getCierres as any)(req(), context, USER);
    expect(listOk.status).toBe(200);

    const listBad = await (getCierres as any)(
      req({ query: { estado: "OTRO" } }),
      context,
      USER,
    );
    expect(listBad.status).toBe(400);

    (svc.obtenerCierre as jest.Mock).mockResolvedValueOnce(null);
    const notFound = await (getCierre as any)(
      req({ params: { cierreId: "99" } }),
      context,
      USER,
    );
    expect(notFound.status).toBe(404);
  });
});
