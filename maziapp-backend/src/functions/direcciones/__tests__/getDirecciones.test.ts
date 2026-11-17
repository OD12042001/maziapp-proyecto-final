/**
 * Fase Direcciones — GET /api/contactos/{contactoId}/direcciones.
 *
 * Mismo criterio que getRepresentantes.test.ts.
 */
import { getDirecciones } from "../getDirecciones";
import * as direccionService from "../../../services/direcciones/direccion.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/direcciones/direccion.service");
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

describe("getDirecciones (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10" });
    const res = await getDirecciones(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al listar direcciones con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(403);
    expect(direccionService.listarDirecciones).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.listarDirecciones).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA): un contacto ajeno o inexistente
  // responde 404, nunca 403 ni 200 -- incluye explícitamente el caso
  // "otro usuario intenta acceder a las direcciones de un contacto que
  // no es suyo" (mismo mock que "no existe": el service ya colapsa
  // ambos casos en `null`).
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.listarDirecciones as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "999" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(404);
  });

  test("200 con la lista de direcciones activas del contacto, incluyendo Distrito/Provincia/Departamento", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.listarDirecciones as jest.Mock).mockResolvedValue([
      {
        idDireccion: 1,
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        calle: "Av. Test",
        numero: "123",
      },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([
      {
        idDireccion: 1,
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        calle: "Av. Test",
        numero: "123",
      },
    ]);
  });

  test("200 con arreglo vacío cuando el contacto no tiene direcciones", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.listarDirecciones as jest.Mock).mockResolvedValue([]);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([]);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.listarDirecciones as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Direcciones'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getDirecciones(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Direcciones|Invalid object name/i);
  });
});
