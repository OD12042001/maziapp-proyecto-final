/**
 * Fase Direcciones — PATCH /api/contactos/{contactoId}/direcciones/{direccionId}.
 *
 * Mismo criterio que createDireccion.test.ts/updateContacto.test.ts.
 */
import { updateDireccion } from "../updateDireccion";
import * as direccionService from "../../../services/direcciones/direccion.service";
import { DireccionDistritoInvalidoError } from "../../../services/direcciones/direccion.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/direcciones/direccion.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: {
  authHeader?: string;
  contactoId?: string;
  direccionId?: string;
  body?: any;
}) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, direccionId: opts.direccionId },
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

describe("updateDireccion (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "10", direccionId: "1", body: payloadValido });
    const res = await updateDireccion(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al actualizar dirección con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(403);
    expect(direccionService.actualizarDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId o el direccionId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.actualizarDireccion).not.toHaveBeenCalled();
  });

  test("400 cuando el payload no pasa Zod (idDistrito ausente)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const { idDistrito, ...sinDistrito } = payloadValido;
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
      body: sinDistrito,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(400);
    expect(direccionService.actualizarDireccion).not.toHaveBeenCalled();
  });

  // Anti-enumeración: el mismo 404 tanto si el contacto no es del
  // usuario como si la dirección no existe/no es de este contacto --
  // incluye explícitamente "otro usuario intenta editar la dirección
  // de un contacto que no es suyo" (el service colapsa ambos casos en
  // `null`, verificado en direccion.service.test.ts).
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.actualizarDireccion as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      direccionId: "1",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(404);
  });

  test("404 cuando la dirección no existe o no es de este contacto", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.actualizarDireccion as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "999",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el idDistrito no existe/no está activo (DireccionDistritoInvalidoError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.actualizarDireccion as jest.Mock).mockRejectedValue(
      new DireccionDistritoInvalidoError("El distrito seleccionado no es válido."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(400);
  });

  test("200 en actualización exitosa, con la dirección actualizada", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.actualizarDireccion as jest.Mock).mockResolvedValue({
      idDireccion: 1,
      idDistrito: 1501,
      distrito: "MIRAFLORES",
      provincia: "LIMA",
      departamento: "LIMA",
      calle: "Av. Javier Prado Este",
      numero: "1234",
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toMatchObject({ idDireccion: 1, distrito: "MIRAFLORES" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (direccionService.actualizarDireccion as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Direcciones'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      direccionId: "1",
      body: payloadValido,
    });
    const res = await updateDireccion(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Direcciones|Invalid object name/i);
  });
});
