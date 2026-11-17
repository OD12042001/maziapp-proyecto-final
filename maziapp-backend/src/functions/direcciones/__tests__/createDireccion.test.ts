/**
 * Fase Direcciones — POST /api/contactos/{contactoId}/direcciones.
 *
 * Mismo criterio que createRepresentante.test.ts.
 */
import { createDireccion } from "../createDireccion";
import * as direccionService from "../../../services/direcciones/direccion.service";
import { DireccionDistritoInvalidoError } from "../../../services/direcciones/direccion.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/direcciones/direccion.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; contactoId?: string; body?: any }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId },
    json: async () => opts.body ?? {},
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const payloadValido = {
  idDistrito: 1501,
  calle: "Av. Javier Prado Este",
  numero: "1234",
};

describe("createDireccion (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", body: payloadValido });
    const res = await createDireccion(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al crear dirección con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(403);
    expect(direccionService.crearDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", body: payloadValido });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.crearDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando no se seleccionó un distrito válido (idDistrito ausente, rechazado por Zod, no llega al service)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const { idDistrito, ...sinDistrito } = payloadValido;
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: sinDistrito,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.crearDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando el payload envía un campo técnico (idDireccion) -> rechazado por Zod .strict(), no llega al service", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { ...payloadValido, idDireccion: "999" },
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.crearDireccion).not.toHaveBeenCalled();
  });

  // Un intento de inyección SQL en calle/numero llega al service como
  // texto normal (Zod solo valida longitud) -- la protección real es
  // la parametrización de direccion.repository.ts.
  test("intento de SQL en 'calle' se procesa como texto normal (201), sin ejecutar SQL arbitrario", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.crearDireccion as jest.Mock).mockResolvedValue({ idDireccion: 1 });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { ...payloadValido, calle: "Av. Test'; DROP TABLE dbo.Direcciones;--" },
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(201);
  });

  // Anti-enumeración (IDOR/BOLA): contacto ajeno o inexistente -> 404.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.crearDireccion as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      body: payloadValido,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el idDistrito no existe/no está activo (DireccionDistritoInvalidoError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.crearDireccion as jest.Mock).mockRejectedValue(
      new DireccionDistritoInvalidoError("El distrito seleccionado no es válido."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(400);
  });

  test("201 en alta exitosa, con la dirección creada", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.crearDireccion as jest.Mock).mockResolvedValue({
      idDireccion: 1,
      idContacto: 10,
      idDistrito: 1501,
      distrito: "MIRAFLORES",
      provincia: "LIMA",
      departamento: "LIMA",
      calle: "Av. Javier Prado Este",
      numero: "1234",
      departamentoInterior: null,
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(201);
    expect(res.jsonBody).toMatchObject({ idDireccion: 1, distrito: "MIRAFLORES" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.crearDireccion as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Direcciones'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createDireccion(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Direcciones|Invalid object name/i);
  });
});
