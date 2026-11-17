/**
 * Fase Actividad -- GET /api/ciiu?search=...
 * Mismo criterio que getDistritos.test.ts.
 */
import { getCiiu } from "../getCiiu";
import * as ciiuService from "../../../services/ciiu/ciiu.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/ciiu/ciiu.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; search?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: {},
    query: { get: (name: string) => (name === "search" ? opts.search ?? null : null) },
    json: async () => ({}),
  } as any;
}

const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;

describe("getCiiu (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ search: "62" });
    const res = await getCiiu(req, context);
    expect(res.status).toBe(401);
  });

  test("400 cuando search tiene menos de 2 caracteres", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    const req = buildRequest({ authHeader: "Bearer token-valido", search: "6" });
    const res = await getCiiu(req, context);
    expect(res.status).toBe(400);
    expect(ciiuService.buscarCiiu).not.toHaveBeenCalled();
  });

  test("200 con la lista de CIIU coincidentes", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (ciiuService.buscarCiiu as jest.Mock).mockResolvedValue([
      { ciiuId: 1, codigo: "6201", descripcion: "Programación informática" },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "62" });
    const res = await getCiiu(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([{ ciiuId: 1, codigo: "6201", descripcion: "Programación informática" }]);
  });

  test("200 con arreglo vacío cuando el catálogo todavía no tiene datos cargados", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (ciiuService.buscarCiiu as jest.Mock).mockResolvedValue([]);

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "62" });
    const res = await getCiiu(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([]);
  });

  test("500 en error genérico -> mensaje sanitizado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (ciiuService.buscarCiiu as jest.Mock).mockRejectedValue(new Error("Invalid object name 'dbo.CatalogoCiiu'."));

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "62" });
    const res = await getCiiu(req, context);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.jsonBody)).not.toMatch(/dbo\.CatalogoCiiu|Invalid object name/i);
  });
});
