/**
 * Fase Representantes —
 * DELETE /api/contactos/{contactoId}/representantes/{representanteId}.
 *
 * Mismo criterio que updateContacto.test.ts: mockea `validateToken` y
 * `representante.service`, y prueba el CABLEADO Function -> withAuth
 * -> Service -> manejo de errores/respuestas.
 */
import { deactivateRepresentante } from "../deactivateRepresentante";
import * as representanteService from "../../../services/representantes/representante.service";
import { RepresentanteContactoNoJuridicaError } from "../../../services/representantes/representante.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/representantes/representante.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: {
  authHeader?: string;
  contactoId?: string;
  representanteId?: string;
}) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, representanteId: opts.representanteId },
    json: async () => ({}),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("deactivateRepresentante (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", representanteId: "5" });
    const res = await deactivateRepresentante(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al desactivar representante con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
    });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(403);
    expect(representanteService.desactivarRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", representanteId: "5" });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.desactivarRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando falta el representanteId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.desactivarRepresentante).not.toHaveBeenCalled();
  });

  // Anti-enumeración: contacto ajeno/inexistente, o relación
  // inexistente/ya inactiva -> mismo 404 en todos los casos.
  test("404 cuando el contacto no existe, no es del usuario, o la relación no existe/ya está inactiva", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.desactivarRepresentante as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
    });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el contacto es NATURAL (RepresentanteContactoNoJuridicaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.desactivarRepresentante as jest.Mock).mockRejectedValue(
      new RepresentanteContactoNoJuridicaError(
        "El contacto no es una persona jurídica: no admite representantes.",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      representanteId: "5",
    });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(400);
  });

  test("204 en desactivación exitosa, sin cuerpo", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.desactivarRepresentante as jest.Mock).mockResolvedValue(true);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
    });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(204);
    expect(res.jsonBody).toBeUndefined();
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.desactivarRepresentante as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoRepresentante'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
    });
    const res = await deactivateRepresentante(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.ContactoRepresentante|Invalid object name/i);
  });
});
