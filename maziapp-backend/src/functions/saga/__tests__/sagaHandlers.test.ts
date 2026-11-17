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

jest.mock("../../../services/saga/saga.service", () => ({
  obtenerSaga: jest.fn(),
}));

import * as svc from "../../../services/saga/saga.service";
import { getSaga } from "../getSaga";

const context: any = {
  invocationId: "inv-saga-1",
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function req(params: Record<string, string> = {}): any {
  return {
    method: "GET",
    params,
    query: new URLSearchParams(),
    headers: new Headers({ "x-correlation-id": "corr-saga-req" }),
  };
}

describe("saga handler (S4)", () => {
  test("GET /sagas/{correlationId} responde 404 para id inválido o inexistente y 200 cuando existe", async () => {
    const corto = await (getSaga as any)(
      req({ correlationId: "abc" }),
      context,
    );
    expect(corto.status).toBe(404);

    (svc.obtenerSaga as jest.Mock).mockResolvedValueOnce(null);
    const notFound = await (getSaga as any)(
      req({ correlationId: "corr-inexistente-01" }),
      context,
    );
    expect(notFound.status).toBe(404);

    (svc.obtenerSaga as jest.Mock).mockResolvedValueOnce({
      sagaInstanciaId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      correlationId: "corr-saga-001",
      oportunidadId: 7,
      proceso: "KYC_CIERRE_COMISION",
      estado: "COMPLETADA",
      pasoActual: 4,
      pasos: [],
    });
    const ok = await (getSaga as any)(
      req({ correlationId: "corr-saga-001" }),
      context,
    );
    expect(ok.status).toBe(200);
    expect(ok.jsonBody.estado).toBe("COMPLETADA");
  });
});
