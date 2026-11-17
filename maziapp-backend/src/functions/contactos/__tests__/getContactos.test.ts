/**
 * Cobertura de autorización REAL en backend para GET /api/contactos
 * (migración de roles, agosto 2026) — no basta con que el menú del
 * frontend oculte/muestre la opción; este archivo prueba el cableado
 * Function -> withAuth -> Service.
 *
 * Mockea `validateToken` (JWKS/Entra ID real no disponible en pruebas)
 * y `contacto.service` (Azure SQL real no disponible en pruebas).
 */
import { getContactos } from "../getContactos";
import * as contactoService from "../../../services/contactos/contacto.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/contacto.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; id?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { id: opts.id },
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("getContactos (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({});
    const res = await getContactos(req, context);
    expect(res.status).toBe(401);
  });

  // Migración de roles: solo Freelance/ejecutivo_inversion puede llamar
  // a este endpoint. Ni el legacy supervisor_inversion ni ninguno de los
  // 4 roles nuevos tiene, hoy, un permiso confirmado de leer Contactos
  // (ver Auditoria_MaziFlow_Migracion_Roles.docx, secciones 13-16).
  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
    "algun_otro_rol",
  ])("403 al listar contactos con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getContactos(req, context);

    expect(res.status).toBe(403);
    expect(contactoService.listarContactos).not.toHaveBeenCalled();
  });

  test("200 al listar contactos con rol ejecutivo_inversion (Freelance)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.listarContactos as jest.Mock).mockResolvedValue([
      { id: "1", responsableId: "user-1" },
    ]);

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getContactos(req, context);

    expect(res.status).toBe(200);
    expect(contactoService.listarContactos).toHaveBeenCalledWith(
      expect.objectContaining({ oid: "user-1", roles: ["ejecutivo_inversion"] }),
    );
  });

  test("200 al consultar un contacto propio por id", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({
      id: "1",
      responsableId: "user-1",
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", id: "1" });
    const res = await getContactos(req, context);

    expect(res.status).toBe(200);
  });

  // Anti-enumeración (IDOR/BOLA): un contacto ajeno debe responder 404,
  // nunca 403 ni 200 — el service ya filtra por responsableId; aquí solo
  // se prueba que la Function propaga ese `null` como 404 sin filtrar
  // nada por rol (ya no hay rama "supervisor ve todos").
  test("404 al consultar por id un contacto que no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({ authHeader: "Bearer token-valido", id: "999" });
    const res = await getContactos(req, context);

    expect(res.status).toBe(404);
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.listarContactos as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Contactos'."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getContactos(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Contactos|Invalid object name/i);
  });
});
