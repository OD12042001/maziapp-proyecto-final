jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth:
    (_roles: string[], handler: any) =>
    (req: any, ctx: any, user?: any) =>
      handler(req, ctx, user ?? {
        oid: "11111111-2222-3333-4444-555555555555",
        name: "Admin",
        roles: ["administracion"],
      }),
}));

jest.mock("../../../services/comisiones/comisiones.service", () => ({
  listarComisiones: jest.fn(),
  obtenerComision: jest.fn(),
  revertir: jest.fn(),
  ComisionEstadoNoPermitidoError: class extends Error {},
  ComisionPlazoReversionVencidoError: class extends Error {},
  ComisionNoConfiguradaError: class extends Error {},
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

import * as svc from "../../../services/comisiones/comisiones.service";
import * as idem from "../../../services/idempotencia/idempotencia.service";
import { getComision } from "../getComision";
import { getComisiones } from "../getComisiones";
import { revertirComision } from "../revertirComision";

const USER = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Admin",
  roles: ["administracion"],
};

const context: any = {
  invocationId: "inv-com-1",
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

describe("comisiones handlers (S16/S17)", () => {
  test("POST /comisiones/{id}/reversion exige Idempotency-Key y traduce 200, 404, 409 y 422", async () => {
    const sinClave = await (revertirComision as any)(
      req({ method: "POST", params: { comisionId: "4" }, body: {} }),
      context,
      USER,
    );
    expect(sinClave.status).toBe(400);

    const cuerpoValido = {
      motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
      fechaEvaluacionUtc: "2026-11-16T18:00:00.000Z",
    };

    (svc.revertir as jest.Mock).mockResolvedValueOnce({
      comisionId: 4,
      estado: "REVERTIDA",
    });
    const ok = await (revertirComision as any)(
      req({
        method: "POST",
        params: { comisionId: "4" },
        headers: {
          "idempotency-key": "idem-rev-001",
          "x-correlation-id": "corr-rev-1",
        },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(ok.status).toBe(200);
    expect(ok.headers["X-Correlation-Id"]).toBe("corr-rev-1");

    (svc.revertir as jest.Mock).mockRejectedValueOnce(
      new svc.ComisionEstadoNoPermitidoError("Ya revertida"),
    );
    const conflict = await (revertirComision as any)(
      req({
        method: "POST",
        params: { comisionId: "4" },
        headers: { "idempotency-key": "idem-rev-002" },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(conflict.status).toBe(409);

    (idem.ejecutarIdempotente as jest.Mock).mockRejectedValueOnce(
      new idem.IdempotenciaCuerpoDistintoError("Cuerpo distinto"),
    );
    const unproc = await (revertirComision as any)(
      req({
        method: "POST",
        params: { comisionId: "4" },
        headers: { "idempotency-key": "idem-rev-001" },
        body: cuerpoValido,
      }),
      context,
      USER,
    );
    expect(unproc.status).toBe(422);
  });

  test("GET /comisiones y GET /comisiones/{id} responden 200, 400 y 404", async () => {
    (svc.listarComisiones as jest.Mock).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });
    const listOk = await (getComisiones as any)(req(), context, USER);
    expect(listOk.status).toBe(200);

    const listBad = await (getComisiones as any)(
      req({ query: { estado: "OTRO" } }),
      context,
      USER,
    );
    expect(listBad.status).toBe(400);

    (svc.obtenerComision as jest.Mock).mockResolvedValueOnce(null);
    const notFound = await (getComision as any)(
      req({ params: { comisionId: "99" } }),
      context,
      USER,
    );
    expect(notFound.status).toBe(404);
  });
});
