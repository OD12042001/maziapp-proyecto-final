/**
 * Cobertura de los escenarios 12-14 pedidos en Fase 3, sección 17:
 *   12. Documento duplicado -> 409
 *   13. Sin token -> 401
 *   14. Sin rol -> 403
 *
 * Mockea `validateToken` (para no depender de JWKS/Entra ID real) y
 * `contacto.service` (para no depender de una conexión real a Azure
 * SQL). El objetivo de este archivo es probar el CABLEADO
 * Function -> withAuth -> Service -> manejo de errores, no la lógica
 * interna de cada capa (que ya se prueba por separado).
 */
import { createContacto } from "../createContacto";
import * as contactoService from "../../../services/contactos/contacto.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/contacto.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; body?: any }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    json: async () => opts.body ?? {},
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const payloadValido = {
  tipoContacto: "NATURAL",
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombres: "Juan",
  apellidos: "Perez",
};

describe("createContacto (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("13. Sin token -> 401", async () => {
    const req = buildRequest({ body: payloadValido }); // sin authHeader
    const res = await createContacto(req, context);
    expect(res.status).toBe(401);
  });

  test("14. Sin rol requerido -> 403", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["algun_otro_rol"],
      name: "Test User",
      preferred_username: "test@example.com",
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: payloadValido,
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(403);
  });

  // Migración de roles (agosto 2026): la creación de Contactos es
  // exclusiva de ejecutivo_inversion (Freelance). Ninguno de los roles
  // nuevos, ni el legacy supervisor_inversion, debe poder crear
  // contactos — ver config/roles.ts::CONTACTOS_ROLES_PERMITIDOS.
  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al intentar crear contacto con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: payloadValido,
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(403);
    expect(contactoService.crearContacto).not.toHaveBeenCalled();
  });

  test("201 en creación exitosa (rol válido)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
      name: "Test User",
      preferred_username: "test@example.com",
    });
    (contactoService.crearContacto as jest.Mock).mockResolvedValue({
      id: "1",
      tipoContacto: "NATURAL",
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: payloadValido,
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(201);
  });

  test("400 con payload inválido (no llega a tocar el service)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: { tipoContacto: "NATURAL" }, // incompleto
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(400);
    expect(contactoService.crearContacto).not.toHaveBeenCalled();
  });

  test("12. Documento duplicado (SQL 2627) -> 409 con mensaje seguro", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const sqlError: any = new Error(
      "Violation of UNIQUE KEY constraint 'UQ_Contactos_TipoDocumento_NumeroDocumento'. Cannot insert duplicate key in object 'dbo.Contactos'.",
    );
    sqlError.number = 2627;
    (contactoService.crearContacto as jest.Mock).mockRejectedValue(sqlError);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: payloadValido,
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(409);
    // El mensaje al cliente NO debe contener el nombre de la
    // constraint, la tabla ni el texto nativo del error de SQL Server.
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/UQ_Contactos|dbo\.Contactos|UNIQUE KEY/i);
    expect(res.jsonBody.message).toBe(
      "Ya existe un contacto registrado con ese tipo y número de documento.",
    );
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.crearContacto as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Contactos'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: payloadValido,
    });

    const res = await createContacto(req, context);
    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Contactos|Invalid object name/i);
  });
});
