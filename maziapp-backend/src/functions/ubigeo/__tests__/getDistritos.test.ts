/**
 * Fase Direcciones — GET /api/distritos?search=...
 *
 * Mismo criterio que getRepresentantes.test.ts: mockea `validateToken`
 * y `ubigeo.service`, y prueba el CABLEADO Function -> Zod -> withAuth
 * -> Service -> manejo de errores/respuestas, no la lógica interna de
 * cada capa.
 */
import { getDistritos } from "../getDistritos";
import * as ubigeoService from "../../../services/ubigeo/ubigeo.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/ubigeo/ubigeo.service");
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
    query: {
      get: (name: string) => (name === "search" ? opts.search ?? null : null),
    },
    json: async () => ({}),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("getDistritos (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ search: "lima" });
    const res = await getDistritos(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al buscar distritos con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "lima" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(403);
    expect(ubigeoService.buscarDistritos).not.toHaveBeenCalled();
  });

  test("400 cuando search tiene menos de 2 caracteres", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "l" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(400);
    expect(ubigeoService.buscarDistritos).not.toHaveBeenCalled();
  });

  test("400 cuando falta el parámetro search", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(400);
    expect(ubigeoService.buscarDistritos).not.toHaveBeenCalled();
  });

  // Un intento de inyección SQL en `search` llega al service como
  // texto normal (Zod solo valida longitud) -- la protección real es
  // la parametrización en ubigeo.repository.ts (ver ese test).
  test("search con sintaxis SQL maliciosa se procesa como búsqueda normal (200), sin ejecutar SQL arbitrario", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (ubigeoService.buscarDistritos as jest.Mock).mockResolvedValue([]);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      search: "lima'; DROP TABLE dbo.Distritos;--",
    });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(200);
    expect(ubigeoService.buscarDistritos).toHaveBeenCalledWith(
      "lima'; DROP TABLE dbo.Distritos;--",
    );
  });

  test("200 con la lista de distritos {idDistrito, distrito, provincia, departamento}", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (ubigeoService.buscarDistritos as jest.Mock).mockResolvedValue([
      { idDistrito: 1501, distrito: "MIRAFLORES", provincia: "LIMA", departamento: "LIMA" },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "mira" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([
      { idDistrito: 1501, distrito: "MIRAFLORES", provincia: "LIMA", departamento: "LIMA" },
    ]);
  });

  test("200 con arreglo vacío cuando no hay coincidencias", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (ubigeoService.buscarDistritos as jest.Mock).mockResolvedValue([]);

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "zzzzz" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([]);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (ubigeoService.buscarDistritos as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Distritos'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", search: "lima" });
    const res = await getDistritos(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Distritos|Invalid object name/i);
  });
});
