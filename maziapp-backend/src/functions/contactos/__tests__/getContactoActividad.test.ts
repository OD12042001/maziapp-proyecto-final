/**
 * Fase Actividad -- GET /api/contactos/{contactoId}/actividad.
 * Mismo criterio que getDirecciones.test.ts.
 */
import { getContactoActividad } from "../getContactoActividad";
import * as contactoActividadService from "../../../services/contactos/contactoActividad.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/contactoActividad.service");
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
    query: { get: () => null },
    json: async () => ({}),
  } as any;
}

const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;

describe("getContactoActividad (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10" });
    const res = await getContactoActividad(req, context);
    expect(res.status).toBe(401);
  });

  test.each(["supervisor_inversion", "compliance", "administracion", "direccion_comercial", "gerencia_general"])(
    "403 con rol '%s' (no es Freelance)",
    async (rol) => {
      (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: [rol] });
      const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
      const res = await getContactoActividad(req, context);
      expect(res.status).toBe(403);
      expect(contactoActividadService.obtenerActividad).not.toHaveBeenCalled();
    },
  );

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getContactoActividad(req, context);
    expect(res.status).toBe(400);
  });

  test("404 (anti-enumeración) cuando el contacto no existe o no es del usuario", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (contactoActividadService.obtenerActividad as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "999" });
    const res = await getContactoActividad(req, context);

    expect(res.status).toBe(404);
  });

  // 🔐 Requisito explícito de la Etapa 3: GET Actividad ya NO debe
  // devolver `trabajos` -- la nueva (y única) fuente de verdad es
  // GET /api/contactos/{contactoId}/trabajos-dependientes (Etapa 2).
  // No mantener dos fuentes de lectura del mismo dato.
  test("200 con {tipoContacto, actividad}, sin trabajos", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (contactoActividadService.obtenerActividad as jest.Mock).mockResolvedValue({
      tipoContacto: "NATURAL",
      actividad: null,
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getContactoActividad(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({ tipoContacto: "NATURAL", actividad: null });
    expect(res.jsonBody).not.toHaveProperty("trabajos");
  });

  test("500 en error genérico -> mensaje sanitizado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({ oid: "user-1", roles: ["ejecutivo_inversion"] });
    (contactoActividadService.obtenerActividad as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoActividad'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getContactoActividad(req, context);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.jsonBody)).not.toMatch(/dbo\.ContactoActividad|Invalid object name/i);
  });
});
