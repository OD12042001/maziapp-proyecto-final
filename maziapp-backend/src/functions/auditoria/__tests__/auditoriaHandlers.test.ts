jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth: (_roles: string[], handler: unknown) => handler,
}));

jest.mock("../../../services/auditoria/auditoria.service", () => ({
  listarEventos: jest.fn(),
  obtenerEvento: jest.fn(),
}));

import * as svc from "../../../services/auditoria/auditoria.service";
import { getEventosAuditoria } from "../getEventosAuditoria";
import { getEventoAuditoria } from "../getEventoAuditoria";

const USER = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Admin",
  roles: ["administracion"],
};

const context: any = {
  invocationId: "inv-aud-1",
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function req(
  o: {
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
): any {
  return {
    method: "GET",
    params: o.params ?? {},
    query: new URLSearchParams(o.query ?? {}),
    headers: new Headers(o.headers ?? {}),
  };
}

describe("auditoria handlers (S40)", () => {
  test("GET /auditoria/eventos responde 200 con página y eco de X-Correlation-Id", async () => {
    (svc.listarEventos as jest.Mock).mockResolvedValue({
      items: [{ eventoId: "10", servicioCodigo: "S06" }],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    const res = await (getEventosAuditoria as any)(
      req({
        query: { servicioCodigo: "S06" },
        headers: { "x-correlation-id": "corr-aud-100" },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(res.headers["X-Correlation-Id"]).toBe("corr-aud-100");
    expect(res.jsonBody.total).toBe(1);
  });

  test("GET /auditoria/eventos responde 400 cuando los filtros son inválidos", async () => {
    const res = await (getEventosAuditoria as any)(
      req({ query: { resultado: "INVALIDO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe("Filtros de auditoría inválidos");
    expect(res.jsonBody.errors.fieldErrors.resultado).toBeDefined();
  });

  test("GET /auditoria/eventos/{eventoId} responde 404 para id no numérico o inexistente", async () => {
    const resMalFormado = await (getEventoAuditoria as any)(
      req({ params: { eventoId: "no-num" } }),
      context,
      USER,
    );
    expect(resMalFormado.status).toBe(404);
    expect(svc.obtenerEvento).not.toHaveBeenCalled();

    (svc.obtenerEvento as jest.Mock).mockResolvedValue(null);
    const resNoExiste = await (getEventoAuditoria as any)(
      req({ params: { eventoId: "999" } }),
      context,
      USER,
    );
    expect(resNoExiste.status).toBe(404);
  });

  test("GET /auditoria/eventos/{eventoId} responde 200 cuando existe", async () => {
    (svc.obtenerEvento as jest.Mock).mockResolvedValue({
      eventoId: "12",
      servicioCodigo: "S12",
      operacion: "DictaminarExpediente",
      resultado: "EXITO",
    });

    const res = await (getEventoAuditoria as any)(
      req({ params: { eventoId: "12" } }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(res.jsonBody.eventoId).toBe("12");
  });
});
