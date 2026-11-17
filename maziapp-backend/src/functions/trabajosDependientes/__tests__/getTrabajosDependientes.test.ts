/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- GET /api/contactos/{contactoId}/trabajos-dependientes.
 *
 * Mismo criterio que getDirecciones.test.ts.
 */
import { getTrabajosDependientes } from "../getTrabajosDependientes";
import * as trabajoDependienteService from "../../../services/trabajosDependientes/trabajoDependiente.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/trabajosDependientes/trabajoDependiente.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; contactoId?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId },
    json: async () => ({}),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("getTrabajosDependientes (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "20" });
    const res = await getTrabajosDependientes(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al listar trabajos dependientes con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(403);
    expect(trabajoDependienteService.listarTrabajosDependientes).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.listarTrabajosDependientes).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA): un contacto ajeno o inexistente
  // responde 404, nunca 403 ni 200 -- el service ya colapsa ambos
  // casos en `null`.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.listarTrabajosDependientes as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "999" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(404);
  });

  test("200 con la lista de trabajos dependientes activos del contacto, incluyendo Empresa", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.listarTrabajosDependientes as jest.Mock).mockResolvedValue([
      {
        id: "1",
        contactoId: "20",
        empresa: { tipo: "LIBRE", contactoId: null, nombre: "Empresa Libre S.A." },
        cargo: "Analista",
        desde: "2020-01-01",
        hasta: null,
      },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([
      {
        id: "1",
        contactoId: "20",
        empresa: { tipo: "LIBRE", contactoId: null, nombre: "Empresa Libre S.A." },
        cargo: "Analista",
        desde: "2020-01-01",
        hasta: null,
      },
    ]);
  });

  test("200 con arreglo vacío cuando el contacto no tiene trabajos dependientes", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.listarTrabajosDependientes as jest.Mock).mockResolvedValue([]);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([]);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.listarTrabajosDependientes as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoTrabajoDependiente'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await getTrabajosDependientes(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.ContactoTrabajoDependiente|Invalid object name/i);
  });
});
