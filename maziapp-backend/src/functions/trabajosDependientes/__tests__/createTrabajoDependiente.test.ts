/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- POST /api/contactos/{contactoId}/trabajos-dependientes.
 *
 * Mismo criterio que createDireccion.test.ts.
 */
import { createTrabajoDependiente } from "../createTrabajoDependiente";
import * as trabajoDependienteService from "../../../services/trabajosDependientes/trabajoDependiente.service";
import {
  TrabajoDependienteTipoIncorrectoError,
  TrabajoDependienteEmpresaInvalidaError,
} from "../../../services/trabajosDependientes/trabajoDependiente.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/trabajosDependientes/trabajoDependiente.service");
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
  empresaNombreLibre: "Empresa Libre S.A.",
  cargo: "Analista",
  desde: "2020-01-01",
};

describe("createTrabajoDependiente (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Sin token -> 401", async () => {
    const req = buildRequest({ contactoId: "20", body: payloadValido });
    const res = await createTrabajoDependiente(req, context);
    expect(res.status).toBe(401);
  });

  test.each([
    "supervisor_inversion",
    "compliance",
    "administracion",
    "direccion_comercial",
    "gerencia_general",
  ])("403 al crear trabajo dependiente con rol '%s' (no es Freelance)", async (rol) => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: [rol],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: payloadValido,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(403);
    expect(trabajoDependienteService.crearTrabajoDependiente).not.toHaveBeenCalled();
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", body: payloadValido });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.crearTrabajoDependiente).not.toHaveBeenCalled();
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
      body: sinCargo,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.crearTrabajoDependiente).not.toHaveBeenCalled();
  });

  test("400 cuando el payload no pasa Zod (empresaContactoId y empresaNombreLibre ambos presentes)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: { ...payloadValido, empresaContactoId: 30 },
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
    expect(trabajoDependienteService.crearTrabajoDependiente).not.toHaveBeenCalled();
  });

  // Anti-enumeración: el mismo 404 tanto si el contacto no existe como
  // si existe pero no pertenece al usuario autenticado.
  test("404 cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.crearTrabajoDependiente as jest.Mock).mockResolvedValue(null);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "999",
      body: payloadValido,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(404);
  });

  test("400 cuando el contacto no es de tipo NATURAL (TrabajoDependienteTipoIncorrectoError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.crearTrabajoDependiente as jest.Mock).mockRejectedValue(
      new TrabajoDependienteTipoIncorrectoError(
        "Trabajos dependientes no son válidos para un contacto de tipo JURIDICA",
      ),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: payloadValido,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
  });

  test("400 cuando empresaContactoId no es una empresa válida/accesible (TrabajoDependienteEmpresaInvalidaError)", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.crearTrabajoDependiente as jest.Mock).mockRejectedValue(
      new TrabajoDependienteEmpresaInvalidaError("La empresa seleccionada no es válida."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: { empresaContactoId: 30, cargo: "Analista", desde: "2020-01-01" },
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(400);
  });

  test("201 en creación exitosa, con el trabajo dependiente creado", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.crearTrabajoDependiente as jest.Mock).mockResolvedValue({
      id: "1",
      contactoId: "20",
      empresa: { tipo: "LIBRE", contactoId: null, nombre: "Empresa Libre S.A." },
      cargo: "Analista",
      desde: "2020-01-01",
      hasta: null,
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: payloadValido,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(201);
    expect(res.jsonBody).toMatchObject({ id: "1", cargo: "Analista" });
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    (trabajoDependienteService.crearTrabajoDependiente as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoTrabajoDependiente'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: payloadValido,
    });
    const res = await createTrabajoDependiente(req, context);

    expect(res.status).toBe(500);
    const body = JSON.stringify(res.jsonBody);
    expect(body).not.toMatch(/dbo\.ContactoTrabajoDependiente|Invalid object name/i);
  });
});
