/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- PATCH /api/contactos/{contactoId}/trabajos-dependientes/{trabajoId}.
 *
 * Mismo criterio que updateDireccion.test.ts.
 */
import { updateTrabajoDependiente } from "../updateTrabajoDependiente";
import * as trabajoDependienteService from "../../../services/trabajosDependientes/trabajoDependiente.service";
import { TrabajoDependienteEmpresaInvalidaError } from "../../../services/trabajosDependientes/trabajoDependiente.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/trabajosDependientes/trabajoDependiente.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

function buildRequest(opts: {
  authHeader?: string;
  contactoId?: string;
  trabajoId?: string;
  body?: any;
}) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { contactoId: opts.contactoId, trabajoId: opts.trabajoId },
    json: async () => opts.body ?? {},
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

const payloadValido = {
  empresaNombreLibre: "Empresa Libre S.A.",
  cargo: "Analista Senior",
  desde: "2020-01-01",
};

describe("updateTrabajoDependiente (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "20", trabajoId: "1", body: payloadValido });
    const res = await updateTrabajoDependiente(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al actualizar trabajo dependiente con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(403);
    expect(trabajoDependienteService.actualizarTrabajoDependiente).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId o el trabajoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.actualizarTrabajoDependiente).not.toHaveBeenCalled();
  });

  test("400 cuando el payload no pasa Zod (cargo ausente)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const { cargo, ...sinCargo } = payloadValido;
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
      body: sinCargo,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.actualizarTrabajoDependiente).not.toHaveBeenCalled();
  });

  // Anti-enumeración: el mismo 404 tanto si el contacto no existe/no
  // es del usuario, como si el trabajo dependiente no existe, no es de
  // este contacto (IDOR/BOLA -- "otro usuario intenta editar el
  // trabajo de un contacto que no es suyo"), o ya estaba desactivado
  // (Activo = 0) -- el service colapsa los tres casos en el mismo
  // `null` (verificado en trabajoDependiente.service.test.ts).
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.actualizarTrabajoDependiente as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      trabajoId: "1",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(404);
  });

  test("404 cuando el trabajo dependiente no existe, no es de este contacto, o ya está desactivado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.actualizarTrabajoDependiente as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "999",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando empresaContactoId no es una empresa válida/accesible (TrabajoDependienteEmpresaInvalidaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.actualizarTrabajoDependiente as jest.Mock).mockRejectedValue(
      new TrabajoDependienteEmpresaInvalidaError("La empresa seleccionada no es válida."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
      body: { empresaContactoId: 30, cargo: "Analista", desde: "2020-01-01" },
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
  });

  test("200 en actualización exitosa, con el trabajo dependiente actualizado (FechaModificacion actualizada en BD)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.actualizarTrabajoDependiente as jest.Mock).mockResolvedValue({
      id: "1",
      contactoId: "20",
      empresa: { tipo: "LIBRE", contactoId: null, nombre: "Empresa Libre S.A." },
      cargo: "Analista Senior",
      desde: "2020-01-01",
      hasta: null,
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toMatchObject({ id: "1", cargo: "Analista Senior" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.actualizarTrabajoDependiente as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoTrabajoDependiente'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      trabajoId: "1",
      body: payloadValido,
    });
    const res = await updateTrabajoDependiente(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.ContactoTrabajoDependiente|Invalid object name/i);
  });
});
