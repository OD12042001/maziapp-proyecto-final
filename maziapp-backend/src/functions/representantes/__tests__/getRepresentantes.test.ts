/**
 * Fase Representantes — GET /api/contactos/{contactoId}/representantes.
 *
 * Mismo criterio que updateContacto.test.ts/getContactos.test.ts:
 * mockea `validateToken` y `representante.service`, y prueba el
 * CABLEADO Function -> withAuth -> Service -> manejo de errores/
 * respuestas, no la lógica interna de cada capa (probada por separado
 * en representante.service.test.ts / representante.repository.test.ts).
 */
import { getRepresentantes } from "../getRepresentantes";
import * as representanteService from "../../../services/representantes/representante.service";
import { RepresentanteContactoNoJuridicaError } from "../../../services/representantes/representante.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/representantes/representante.service");
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

describe("getRepresentantes (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10" });
    const res = await getRepresentantes(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al listar representantes con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(403);
    expect(representanteService.listarRepresentantes).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.listarRepresentantes).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA), mismo criterio que getContactos.ts:
  // un contacto ajeno o inexistente responde 404, nunca 403 ni 200.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.listarRepresentantes as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "999" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el contacto no es JURIDICA (RepresentanteContactoNoJuridicaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.listarRepresentantes as jest.Mock).mockRejectedValue(
      new RepresentanteContactoNoJuridicaError(
        "El contacto no es una persona jurídica: no admite representantes.",
      ),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(400);
  });

  test("200 con la lista de representantes activos de la empresa", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.listarRepresentantes as jest.Mock).mockResolvedValue([
      { contactoRepresentanteId: "900", representanteId: "5", cargo: "Gerente General" },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([
      { contactoRepresentanteId: "900", representanteId: "5", cargo: "Gerente General" },
    ]);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.listarRepresentantes as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Representantes'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10" });
    const res = await getRepresentantes(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Representantes|Invalid object name/i);
  });
});
