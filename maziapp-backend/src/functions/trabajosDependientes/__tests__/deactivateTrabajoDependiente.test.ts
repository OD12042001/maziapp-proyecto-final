/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- DELETE /api/contactos/{contactoId}/trabajos-dependientes/{trabajoId}.
 *
 * Mismo criterio que deactivateDireccion.test.ts.
 */
import { deactivateTrabajoDependiente } from "../deactivateTrabajoDependiente";
import * as trabajoDependienteService from "../../../services/trabajosDependientes/trabajoDependiente.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/trabajosDependientes/trabajoDependiente.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; contactoId?: string; trabajoId?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, trabajoId: opts.trabajoId },
    json: async () => ({}),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("deactivateTrabajoDependiente (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "20", trabajoId: "1" });
    const res = await deactivateTrabajoDependiente(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al desactivar trabajo dependiente con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
    });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(403);
    expect(trabajoDependienteService.desactivarTrabajoDependiente).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId o el trabajoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.desactivarTrabajoDependiente).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA): incluye explícitamente "un usuario
  // intenta desactivar el trabajo dependiente de un contacto que no es
  // suyo" -- el service colapsa ese caso con "no existe" y con "ya
  // estaba desactivado" en el mismo `null` (verificado en
  // trabajoDependiente.service.test.ts), así que aquí los tres
  // producen el mismo 404, nunca un 403 que revele cuál ocurrió.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.desactivarTrabajoDependiente as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      trabajoId: "1",
    });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(404);
  });

  test("404 cuando el trabajo dependiente ya estaba desactivado (Activo = 0) o nunca existió", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.desactivarTrabajoDependiente as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "999",
    });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(404);
  });

  test("204 en desactivación exitosa (soft delete -- Activo = 0, FechaModificacion actualizada en BD)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.desactivarTrabajoDependiente as jest.Mock).mockResolvedValue(true);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
    });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(204);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.desactivarTrabajoDependiente as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoTrabajoDependiente'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
    });
    const res = await deactivateTrabajoDependiente(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.ContactoTrabajoDependiente|Invalid object name/i);
  });
});
