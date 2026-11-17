/**
 * Fase 3.15 / 7A — PATCH /api/contactos/{id} (Cliente + Ubicación).
 *
 * Mismo criterio que createContacto.test.ts/getContactos.test.ts:
 * mockea `validateToken` y `contacto.service`, y prueba el CABLEADO
 * Function -> withAuth -> Service -> manejo de errores/respuestas, no
 * la lógica interna de cada capa (probada por separado en
 * contacto.service.test.ts / contacto.repository.test.ts /
 * contactoUpdate.validator.test.ts).
 */
import { updateContacto } from "../updateContacto";
import * as contactoService from "../../../services/contactos/contacto.service";
import { ContactoValidationError } from "../../../services/contactos/contacto.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/contacto.service", () => ({
  ...jest.requireActual("../../../services/contactos/contacto.service"),
  actualizarContacto: jest.fn(),
}));
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: { authHeader?: string; id?: string; body?: any }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { id: opts.id },
    json: async () => opts.body ?? {},
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("updateContacto (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ id: "1", body: { celular: "999888777" } });
    const res = await updateContacto(req, context);
    expect(res.status).toBe(401);
  });

  // Migración de roles: mismo rol exigido que crear/listar/consultar.
  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al intentar actualizar contacto con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { celular: "999888777" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(403);
    expect(contactoService.actualizarContacto).not.toHaveBeenCalled();
  });

  test("400 cuando falta el id en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      body: { celular: "999888777" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(400);
    expect(contactoService.actualizarContacto).not.toHaveBeenCalled();
  });

  test("400 con payload inválido (no llega a tocar el service)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { correo: "no-es-un-correo" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(400);
    expect(contactoService.actualizarContacto).not.toHaveBeenCalled();
  });

  test("400 cuando el payload envía un campo técnico (responsableId) -> rechazado por Zod .strict(), no llega al service", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { celular: "999888777", responsableId: "otro-oid" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(400);
    expect(contactoService.actualizarContacto).not.toHaveBeenCalled();
  });

  test("200 en actualización exitosa (Cliente) con rol válido", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.actualizarContacto as jest.Mock).mockResolvedValue({
      id: "1",
      tipoContacto: "NATURAL",
      nombres: "Juan Actualizado",
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { nombres: "Juan Actualizado" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({
      id: "1",
      tipoContacto: "NATURAL",
      nombres: "Juan Actualizado",
    });
  });

  test("200 en actualización exitosa (Ubicación) con rol válido", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.actualizarContacto as jest.Mock).mockResolvedValue({
      id: "1",
      celular: "999888777",
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { celular: "999888777" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(200);
  });

  // Anti-enumeración (IDOR/BOLA), mismo criterio que getContactos.ts:
  // un contacto ajeno responde 404, nunca 403 ni 200.
  test("404 al intentar actualizar un contacto que no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.actualizarContacto as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "999",
      body: { celular: "999888777" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(404);
  });

  test("400 cuando el service rechaza por incoherencia de tipo (ContactoValidationError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.actualizarContacto as jest.Mock).mockRejectedValue(
      new ContactoValidationError(
        "razonSocial no es válido para un contacto de tipo NATURAL",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { razonSocial: "Empresa SAC" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe(
      "razonSocial no es válido para un contacto de tipo NATURAL",
    );
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (contactoService.actualizarContacto as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.Contactos'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      id: "1",
      body: { celular: "999888777" },
    });

    const res = await updateContacto(req, context);
    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.Contactos|Invalid object name/i);
  });
});
