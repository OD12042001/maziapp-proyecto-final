/**
 * Fase Direcciones — DELETE /api/contactos/{contactoId}/direcciones/{direccionId}.
 *
 * Mismo criterio que deactivateRepresentante.test.ts.
 */
import { deactivateDireccion } from "../deactivateDireccion";
import * as direccionService from "../../../services/direcciones/direccion.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/direcciones/direccion.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; contactoId?: string; direccionId?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, direccionId: opts.direccionId },
    json: async () => ({}),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("deactivateDireccion (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", direccionId: "1" });
    const res = await deactivateDireccion(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al desactivar dirección con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
    });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(403);
    expect(direccionService.desactivarDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId o el direccionId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.desactivarDireccion).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA): incluye explícitamente "un usuario
  // intenta desactivar la dirección de un contacto que no es suyo" --
  // el service colapsa ese caso con "no existe" en el mismo `null`
  // (verificado en direccion.service.test.ts), así que aquí ambos
  // producen el mismo 404, nunca un 403 que revele cuál de los dos
  // ocurrió.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.desactivarDireccion as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      direccionId: "1",
    });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(404);
  });

  test("404 cuando la dirección ya estaba desactivada o nunca existió", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.desactivarDireccion as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "999",
    });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(404);
  });

  test("204 en desactivación exitosa", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.desactivarDireccion as jest.Mock).mockResolvedValue(true);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
    });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(204);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.desactivarDireccion as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Direcciones'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
    });
    const res = await deactivateDireccion(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Direcciones|Invalid object name/i);
  });
});
