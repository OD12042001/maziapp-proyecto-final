/**
 * Fase Actividad -- GET /api/contactos/empresas?search=...
 * Mismo criterio que getDistritos.test.ts.
 */
import { getEmpresas } from "../getEmpresas";
import * as empresaBusquedaService from "../../../services/contactos/empresaBusqueda.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/empresaBusqueda.service");
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

describe("getEmpresas (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ search: "acme" });
    const res = await getEmpresas(req, context);
    expect(res.status).toBe(401);
  });

  test.each(["supervisor_inversion", "compliance", "administracion", "direccion_comercial", "gerencia_general"])(
    "403 con rol '%s' (no es Freelance)",
    async (rol) => {
      (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: [rol] });
      const req = buildRequest({ authHeader: "Bearer token-valido", search: "acme" });
      const res = await getEmpresas(req, context);
      expect(res.status).toBe(403);
      expect(empresaBusquedaService.buscarEmpresas).not.toHaveBeenCalled();
    },
  );

  test("400 cuando search tiene menos de 2 caracteres", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    const req = buildRequest({ authHeader: "Bearer token-valido", search: "a" });
    const res = await getEmpresas(req, context);
    expect(res.status).toBe(400);
    expect(empresaBusquedaService.buscarEmpresas).not.toHaveBeenCalled();
  });

  test("200 con la lista de empresas, pasando siempre el usuario autenticado al Service (nunca un id de otro usuario)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (empresaBusquedaService.buscarEmpresas as jest.Mock).mockResolvedValue([
      { contactoId: "5", razonSocial: "Acme SAC" },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "acme" });
    const res = await getEmpresas(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([{ contactoId: "5", razonSocial: "Acme SAC" }]);
    expect(empresaBusquedaService.buscarEmpresas).toHaveBeenCalledWith(
      "acme",
      expect.objectContaining({ oid: "user-1" }),
    );
  });

  test("500 en error genérico -> mensaje sanitizado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (empresaBusquedaService.buscarEmpresas as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Contactos'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "acme" });
    const res = await getEmpresas(req, context);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.jsonBody)).not.toMatch(/dbo\.Contactos|Invalid object name/i);
  });
});
