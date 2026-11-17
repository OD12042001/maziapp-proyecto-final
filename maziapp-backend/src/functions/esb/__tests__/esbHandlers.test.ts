jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth: (_roles: string[], handler: unknown) => handler,
}));

jest.mock("../../../services/esb/esb.service", () => ({
  listarOutbox: jest.fn(),
  listarFallidos: jest.fn(),
  obtenerOutbox: jest.fn(),
  procesarOutbox: jest.fn(),
  EsbNoConfiguradoError: class EsbNoConfiguradoError extends Error {},
}));

import * as svc from "../../../services/esb/esb.service";
import { getOutbox } from "../getOutbox";
import { getOutboxFallidos } from "../getOutboxFallidos";
import { getOutboxEvento } from "../getOutboxEvento";
import { procesarOutbox } from "../procesarOutbox";

const USER = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Admin",
  roles: ["administracion"],
};

const context: any = {
  invocationId: "inv-esb-1",
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function req(
  o: {
    method?: string;
    text?: string;
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
    text: async () => o.text ?? "",
  };
}

describe("esb handlers", () => {
  test("GET /esb/outbox responde 200 y valida filtros con 400", async () => {
    (svc.listarOutbox as jest.Mock).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });

    const ok = await (getOutbox as any)(
      req({
        query: { estado: "PENDIENTE" },
        headers: { "x-correlation-id": "corr-esb-1" },
      }),
      context,
      USER,
    );
    expect(ok.status).toBe(200);
    expect(ok.headers["X-Correlation-Id"]).toBe("corr-esb-1");

    const bad = await (getOutbox as any)(
      req({ query: { estado: "INVALIDO" } }),
      context,
      USER,
    );
    expect(bad.status).toBe(400);
  });

  test("GET /esb/outbox/fallidos responde 200 y rechaza paginación inválida con 400", async () => {
    (svc.listarFallidos as jest.Mock).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
    });

    const ok = await (getOutboxFallidos as any)(req(), context, USER);
    expect(ok.status).toBe(200);

    const bad = await (getOutboxFallidos as any)(
      req({ query: { page: "0" } }),
      context,
      USER,
    );
    expect(bad.status).toBe(400);
  });

  test("GET /esb/outbox/{outboxId} responde 404 para id inválido o inexistente y 200 cuando existe", async () => {
    const badId = await (getOutboxEvento as any)(
      req({ params: { outboxId: "abc" } }),
      context,
      USER,
    );
    expect(badId.status).toBe(404);

    (svc.obtenerOutbox as jest.Mock).mockResolvedValueOnce(null);
    const notFound = await (getOutboxEvento as any)(
      req({ params: { outboxId: "77" } }),
      context,
      USER,
    );
    expect(notFound.status).toBe(404);

    (svc.obtenerOutbox as jest.Mock).mockResolvedValueOnce({ outboxId: "77" });
    const found = await (getOutboxEvento as any)(
      req({ params: { outboxId: "77" } }),
      context,
      USER,
    );
    expect(found.status).toBe(200);
    expect(found.jsonBody.outboxId).toBe("77");
  });

  test("POST /esb/outbox/procesar acepta cuerpo vacío o con limite y rechaza JSON o rango inválido", async () => {
    (svc.procesarOutbox as jest.Mock).mockResolvedValue({
      procesados: 2,
      publicados: 2,
      fallidos: 0,
      muertos: 0,
    });

    const vacio = await (procesarOutbox as any)(
      req({ method: "POST", text: "" }),
      context,
      USER,
    );
    expect(vacio.status).toBe(200);
    expect(svc.procesarOutbox).toHaveBeenCalledWith(20);

    const conLimite = await (procesarOutbox as any)(
      req({ method: "POST", text: '{"limite":5}' }),
      context,
      USER,
    );
    expect(conLimite.status).toBe(200);
    expect(svc.procesarOutbox).toHaveBeenCalledWith(5);

    const jsonRoto = await (procesarOutbox as any)(
      req({ method: "POST", text: "{mal" }),
      context,
      USER,
    );
    expect(jsonRoto.status).toBe(400);

    const fueraDeRango = await (procesarOutbox as any)(
      req({ method: "POST", text: '{"limite":500}' }),
      context,
      USER,
    );
    expect(fueraDeRango.status).toBe(400);
  });
});
