/**
 * Fase Representantes — POST /api/contactos/{contactoId}/representantes.
 *
 * Mismo criterio que updateContacto.test.ts/createContacto.test.ts:
 * mockea `validateToken` y `representante.service`, y prueba el
 * CABLEADO Function -> Zod -> withAuth -> Service -> manejo de
 * errores/respuestas, no la lógica interna de cada capa.
 */
import { createRepresentante } from "../createRepresentante";
import * as representanteService from "../../../services/representantes/representante.service";
import {
  RepresentanteContactoNoJuridicaError,
  RepresentanteRelacionDuplicadaError,
} from "../../../services/representantes/representante.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/representantes/representante.service");
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
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombres: "Juan",
  apellidos: "Pérez",
  cargo: "Gerente General",
};

describe("createRepresentante (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", body: payloadValido });
    const res = await createRepresentante(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al crear representante con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(403);
    expect(representanteService.crearRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", body: payloadValido });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.crearRepresentante).not.toHaveBeenCalled();
  });

  // DNI/CE/PASAPORTE válido.
  test.each(["DNI", "CE", "PASAPORTE"])(
    "tipoDocumento '%s' es aceptado por el validador (llega al service)",
    async (tipoDocumento) => {
      (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
        oid: "user-1",
        roles: ["ejecutivo_inversion"],
      });
      (representanteService.crearRepresentante as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: "900",
      });

      const numeroDocumento =
        tipoDocumento === "DNI" ? "12345678" : tipoDocumento === "CE" ? "000111222" : "AB123456";

      const req = buildRequest({
        authHeader: "Bearer token-valido",
        contactoId: "10",
        body: { ...payloadValido, tipoDocumento, numeroDocumento },
      });
      const res = await createRepresentante(req, context);

      expect(res.status).toBe(201);
      expect(representanteService.crearRepresentante).toHaveBeenCalled();
    },
  );

  // RUC rechazado: un representante es siempre persona natural.
  test("400 cuando tipoDocumento es RUC (rechazado por Zod .enum(), no llega al service)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { ...payloadValido, tipoDocumento: "RUC", numeroDocumento: "20123456789" },
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.crearRepresentante).not.toHaveBeenCalled();
  });

  test("400 con documento de formato inválido para el tipo (no llega al service)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { ...payloadValido, tipoDocumento: "DNI", numeroDocumento: "abc" },
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.crearRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando el payload envía un campo técnico (representanteId) -> rechazado por Zod .strict(), no llega al service", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { ...payloadValido, representanteId: "999" },
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.crearRepresentante).not.toHaveBeenCalled();
  });

  // Anti-enumeración (IDOR/BOLA): contacto ajeno o inexistente -> 404.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.crearRepresentante as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el contacto es NATURAL (RepresentanteContactoNoJuridicaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.crearRepresentante as jest.Mock).mockRejectedValue(
      new RepresentanteContactoNoJuridicaError(
        "El contacto no es una persona jurídica: no admite representantes.",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(400);
  });

  test("409 cuando ya existe una relación activa (RepresentanteRelacionDuplicadaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.crearRepresentante as jest.Mock).mockRejectedValue(
      new RepresentanteRelacionDuplicadaError(
        "Este representante ya está registrado como representante de esta empresa.",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(409);
  });

  // Red de seguridad ante carrera de inserts concurrentes.
  test.each([2601, 2627])(
    "409 cuando SQL Server rechaza por UNIQUE de documento (error.number = %d)",
    async (numeroError) => {
      (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
        oid: "user-1",
        roles: ["ejecutivo_inversion"],
      });
      const sqlError: any = new Error("Violation of UNIQUE KEY constraint");
      sqlError.number = numeroError;
      (representanteService.crearRepresentante as jest.Mock).mockRejectedValue(sqlError);

      const req = buildRequest({
        authHeader: "Bearer token-valido",
        contactoId: "10",
        body: payloadValido,
      });
      const res = await createRepresentante(req, context);

      expect(res.status).toBe(409);
    },
  );

  test("201 en alta exitosa, con el representante creado/reutilizado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.crearRepresentante as jest.Mock).mockResolvedValue({
      contactoRepresentanteId: "900",
      representanteId: "5",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Pérez",
      cargo: "Gerente General",
      celular: null,
      correo: null,
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(201);
    expect(res.jsonBody).toMatchObject({ contactoRepresentanteId: "900" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.crearRepresentante as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Representantes'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createRepresentante(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Representantes|Invalid object name/i);
  });
});
