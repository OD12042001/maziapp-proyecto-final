/**
 * Fase Representantes (Edición) —
 * PATCH /api/contactos/{contactoId}/representantes/{representanteId}.
 *
 * Mismo criterio que updateDireccion.test.ts/createRepresentante.test.ts:
 * mockea `validateToken` y `representante.service`, y prueba el
 * CABLEADO Function -> Zod -> withAuth -> Service -> manejo de
 * errores/respuestas, no la lógica interna de cada capa.
 */
import { updateRepresentante } from "../updateRepresentante";
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
  body?: any;
}) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, representanteId: opts.representanteId },
    json: async () => opts.body ?? {},
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const payloadValido = {
  nombres: "Juan",
  apellidos: "Pérez",
  cargo: "Gerente General",
};

describe("updateRepresentante (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", representanteId: "5", body: payloadValido });
    const res = await updateRepresentante(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al actualizar representante con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(403);
    expect(representanteService.actualizarRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId o el representanteId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.actualizarRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando el payload no pasa Zod (cargo ausente)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const { cargo, ...sinCargo } = payloadValido;
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
      body: sinCargo,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.actualizarRepresentante).not.toHaveBeenCalled();
  });

  // 🔐 tipoDocumento/numeroDocumento son de solo lectura al editar --
  // Zod .strict() los rechaza antes de llegar al service (ver
  // representante.validator.ts::representanteUpdateBaseSchema).
  test("400 cuando el payload envía tipoDocumento (campo no editable) -> rechazado por Zod .strict(), no llega al service", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
      body: { ...payloadValido, tipoDocumento: "DNI" },
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.actualizarRepresentante).not.toHaveBeenCalled();
  });

  test("400 cuando el payload envía un campo técnico (representanteId) -> rechazado por Zod .strict(), no llega al service", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
      body: { ...payloadValido, representanteId: "999" },
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(400);
    expect(representanteService.actualizarRepresentante).not.toHaveBeenCalled();
  });

  // Anti-enumeración: el mismo 404 tanto si el contacto no es del
  // usuario como si la relación con ese representante no existe --
  // incluye explícitamente "otro usuario intenta editar el
  // representante de un contacto que no es suyo" (el service colapsa
  // ambos casos en `null`, verificado en representante.service.test.ts).
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.actualizarRepresentante as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      representanteId: "5",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(404);
  });

  test("404 cuando la relación con el representante no existe o ya está desactivada", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.actualizarRepresentante as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "999",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el contacto es NATURAL (RepresentanteContactoNoJuridicaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.actualizarRepresentante as jest.Mock).mockRejectedValue(
      new RepresentanteContactoNoJuridicaError(
        "El contacto no es una persona jurídica: no admite representantes.",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      representanteId: "5",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(400);
  });

  test("200 en actualización exitosa, con el representante actualizado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.actualizarRepresentante as jest.Mock).mockResolvedValue({
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
      representanteId: "5",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toMatchObject({ contactoRepresentanteId: "900", cargo: "Gerente General" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (representanteService.actualizarRepresentante as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Representantes'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      representanteId: "5",
      body: payloadValido,
    });
    const res = await updateRepresentante(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Representantes|Invalid object name/i);
  });
});
