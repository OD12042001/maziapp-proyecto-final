/**
 * Fase Actividad -- PATCH /api/contactos/{contactoId}/actividad.
 *
 * Endpoint único y transaccional: cubre el CABLEADO Function ->
 * (resolver TipoContacto real) -> Zod (rama correcta) -> Service ->
 * manejo de errores, incluyendo que el Backend NUNCA confía en el
 * Frontend para decidir NATURAL/JURIDICA (usa siempre el TipoContacto
 * real leído de contactoService.obtenerContactoPorId).
 */
import { updateContactoActividad } from "../updateContactoActividad";
import * as contactoService from "../../../services/contactos/contacto.service";
import * as contactoActividadService from "../../../services/contactos/contactoActividad.service";
import {
  ActividadTipoIncorrectoError,
  ActividadCiiuInvalidoError,
} from "../../../services/contactos/contactoActividad.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/contactos/contacto.service");
jest.mock("../../../services/contactos/contactoActividad.service");
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
    query: { get: () => null },
    json: async () => opts.body ?? {},
  } as any;
}

const context = { log: jest.fn(), warn: jest.fn(), error: jest.fn() } as any;

const contactoNatural = { id: "10", pid: 10, tipoContacto: "NATURAL" };
const contactoJuridica = { id: "20", pid: 20, tipoContacto: "JURIDICA" };

describe("updateContactoActividad (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
  });

  test("Sin token -> 401", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockReset();
    const req = buildRequest({ contactoId: "10", body: { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" } });
    const res = await updateContactoActividad(req, context);
    expect(res.status).toBe(401);
  });

  test("400 cuando falta el contactoId en la ruta", async () => {
    const req = buildRequest({ authHeader: "Bearer token-valido", body: {} });
    const res = await updateContactoActividad(req, context);
    expect(res.status).toBe(400);
    expect(contactoService.obtenerContactoPorId).not.toHaveBeenCalled();
  });

  test("404 (anti-enumeración) cuando el contacto no existe o no es del usuario", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);
    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "999", body: {} });
    const res = await updateContactoActividad(req, context);
    expect(res.status).toBe(404);
  });

  test("NATURAL: aplica el schema NATURAL según el TipoContacto real -- 400 si faltan campos obligatorios", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "10", body: { ciiuId: 1 } });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
    expect(contactoActividadService.guardarActividadNatural).not.toHaveBeenCalled();
  });

  test("NATURAL: 200 en guardado exitoso", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
    (contactoActividadService.guardarActividadNatural as jest.Mock).mockResolvedValue({
      tipoContacto: "NATURAL",
      actividad: { contactoId: "10" },
    });

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(200);
    expect(contactoActividadService.guardarActividadNatural).toHaveBeenCalledWith(
      "10",
      { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
      expect.objectContaining({ oid: "user-1" }),
    );
  });

  test("JURIDICA: aplica el schema JURIDICA según el TipoContacto real -- 400 si envían campos de NATURAL en vez de ciiuId", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "20",
      body: { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
    expect(contactoActividadService.guardarActividadJuridica).not.toHaveBeenCalled();
  });

  test("JURIDICA: 200 en guardado exitoso", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
    (contactoActividadService.guardarActividadJuridica as jest.Mock).mockResolvedValue({
      tipoContacto: "JURIDICA",
      actividad: { contactoId: "20", ciiuId: 12 },
    });

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20", body: { ciiuId: 12 } });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(200);
  });

  test("400 cuando el Service rechaza por ActividadTipoIncorrectoError (defensa en profundidad)", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
    (contactoActividadService.guardarActividadNatural as jest.Mock).mockRejectedValue(
      new ActividadTipoIncorrectoError("Grado de instrucción no es válido para JURIDICA"),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
  });

  test("400 cuando el ciiuId no es válido (ActividadCiiuInvalidoError)", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
    (contactoActividadService.guardarActividadJuridica as jest.Mock).mockRejectedValue(
      new ActividadCiiuInvalidoError("El CIIU seleccionado no es válido."),
    );

    const req = buildRequest({ authHeader: "Bearer token-valido", contactoId: "20", body: { ciiuId: 999 } });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
  });

  // 🔐 Requisito explícito de la Etapa 3: el payload ya NO acepta
  // trabajosNuevos/trabajosModificados/trabajosEliminados -- Trabajos
  // Dependientes se guarda exclusivamente vía sus propios endpoints
  // independientes (Etapa 2). El schema NATURAL (`.strict()`) ya no
  // declara estos campos, así que enviarlos rechaza TODO el payload
  // con 400 antes de llegar al Service -- nunca se persiste nada de
  // esto desde aquí.
  test("400 cuando el body de NATURAL incluye trabajosNuevos -- ya no pertenece al contrato de Actividad", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: {
        gradoInstruccion: "TECNICO",
        profesionOcupacion: "Contador",
        trabajosNuevos: [{ empresaContactoId: 999, cargo: "Analista", desde: "2020-01-01" }],
      },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
    expect(contactoActividadService.guardarActividadNatural).not.toHaveBeenCalled();
  });

  test("400 cuando el body de NATURAL incluye trabajosModificados/trabajosEliminados -- tampoco pertenecen al contrato de Actividad", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: {
        gradoInstruccion: "TECNICO",
        profesionOcupacion: "Contador",
        trabajosModificados: [],
        trabajosEliminados: ["1"],
      },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(400);
    expect(contactoActividadService.guardarActividadNatural).not.toHaveBeenCalled();
  });

  test("500 en error genérico -> mensaje sanitizado, sin detalle interno", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
    (contactoActividadService.guardarActividadNatural as jest.Mock).mockRejectedValue(
      new Error("Invalid object name 'dbo.ContactoActividad'."),
    );

    const req = buildRequest({
      authHeader: "Bearer token-valido",
      contactoId: "10",
      body: { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
    });
    const res = await updateContactoActividad(req, context);

    expect(res.status).toBe(500);
    expect(JSON.stringify(res.jsonBody)).not.toMatch(/dbo\.ContactoActividad|Invalid object name/i);
  });
});
