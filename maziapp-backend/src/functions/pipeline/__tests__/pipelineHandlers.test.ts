/**
 * Comportamiento HTTP de los handlers de Pipeline (S06): códigos de
 * estado y forma del cuerpo de error.
 *
 * Complementa a `pipelineRouting.test.ts`, que solo verifica el registro
 * de rutas. Acá se ejerce el handler real (Zod, traducción de errores de
 * negocio a 409, anti-enumeración a 404) con `withAuth`/`withCors`
 * neutralizados y el servicio mockeado: no se toca la base.
 *
 * Estos casos existían solo como verificación manual contra SQL Server
 * (ver L9 del documento de la feature). Este archivo los deja en la
 * suite para que una regresión los detecte sin depender de la base.
 */
jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth: (_roles: string[], handler: unknown) => handler,
}));

jest.mock("../../../middleware/withCors", () => ({
  withCors: (handler: unknown) => handler,
}));

jest.mock("../../../services/pipeline/pipeline.service", () => ({
  listarEtapas: jest.fn(),
  listarOportunidades: jest.fn(),
  crearOportunidad: jest.fn(),
  obtenerOportunidad: jest.fn(),
  avanzarEtapa: jest.fn(),
  marcarPerdida: jest.fn(),
  obtenerHistorial: jest.fn(),
  PipelineMonedaInvalidaError: class extends Error {},
  PipelineSinEtapaInicialError: class extends Error {},
  PipelineOportunidadCerradaError: class extends Error {},
  PipelineEtapaNoSecuencialError: class extends Error {},
  PipelineCierreNoHabilitadoError: class extends Error {},
}));

const svc: any = require("../../../services/pipeline/pipeline.service");

const { createOportunidad } = require("../createOportunidad");
const { getOportunidades } = require("../getOportunidades");
const { getOportunidad } = require("../getOportunidad");
const { avanzarEtapaOportunidad } = require("../avanzarEtapaOportunidad");
const { perderOportunidad } = require("../perderOportunidad");

const USER = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Test",
  roles: ["ejecutivo_inversion"],
};

const context = {
  invocationId: "inv-1",
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

function req(
  o: {
    method?: string;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  } = {},
) {
  return {
    method: o.method ?? "GET",
    params: o.params ?? {},
    query: new URLSearchParams(o.query ?? {}),
    headers: new Headers(o.headers ?? {}),
    json: async () => {
      if (o.body === undefined) throw new SyntaxError("sin cuerpo");

      return o.body;
    },
  };
}

const OPORTUNIDAD = {
  oportunidadId: 7,
  contactoId: 20,
  responsableId: USER.oid,
  estado: "ACTIVA",
  montoEstimado: null,
  monedaCodigo: null,
  etapa: {
    etapaId: 1,
    codigo: "PROSPECTO",
    nombre: "Prospecto",
    orden: 1,
    permiteCierre: false,
    esFinal: false,
    activo: true,
  },
  fechaCreacionUtc: "2026-11-16T10:00:00.000Z",
  fechaIngresoEtapaUtc: "2026-11-16T10:00:00.000Z",
  fechaResultadoUtc: null,
  motivoPerdida: null,
  kycEstado: null,
  cierreId: null,
  comisionId: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /pipeline/oportunidades", () => {
  test("201 con eco de X-Correlation-Id", async () => {
    svc.crearOportunidad.mockResolvedValue(OPORTUNIDAD);

    const res: any = await createOportunidad(
      req({
        method: "POST",
        body: { contactoId: 20 },
        headers: { "x-correlation-id": "corr-1" },
      }),
      context,
    );

    expect(res.status).toBe(201);
    expect(res.headers["X-Correlation-Id"]).toBe("corr-1");
    expect(res.jsonBody.oportunidadId).toBe(7);
  });

  test("400 con fieldErrors y formErrors ante un campo no declarado", async () => {
    const res: any = await createOportunidad(
      req({ method: "POST", body: { contactoId: 20, responsableId: USER.oid } }),
      context,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe("Datos de oportunidad inválidos");
    expect(res.jsonBody.errors).toEqual(
      expect.objectContaining({
        fieldErrors: expect.any(Object),
        formErrors: expect.any(Array),
      }),
    );
    expect(svc.crearOportunidad).not.toHaveBeenCalled();
  });

  test("404 cuando el servicio devuelve null (anti-enumeración)", async () => {
    svc.crearOportunidad.mockResolvedValue(null);

    const res: any = await createOportunidad(
      req({ method: "POST", body: { contactoId: 20 } }),
      context,
    );

    expect(res.status).toBe(404);
    expect(res.jsonBody).toEqual({ message: "Contacto no encontrado" });
  });

  test("400 cuando se informa monto sin moneda", async () => {
    const res: any = await createOportunidad(
      req({ method: "POST", body: { contactoId: 20, montoEstimado: 100 } }),
      context,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.errors.fieldErrors.monedaCodigo).toBeDefined();
  });

  test("400 cuando el cuerpo no es JSON válido", async () => {
    const res: any = await createOportunidad(req({ method: "POST" }), context);

    expect(res.status).toBe(400);
    expect(res.jsonBody).toEqual({ message: "Cuerpo JSON inválido" });
  });
});

describe("GET /pipeline/oportunidades", () => {
  test("200 con el sobre {items,page,pageSize,total}", async () => {
    svc.listarOportunidades.mockResolvedValue({
      items: [OPORTUNIDAD],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    const res: any = await getOportunidades(req({ query: { page: "1", pageSize: "20" } }), context);

    expect(res.status).toBe(200);
    expect(Object.keys(res.jsonBody).sort()).toEqual(["items", "page", "pageSize", "total"]);
  });

  test("400 cuando pageSize supera el tope de 100", async () => {
    const res: any = await getOportunidades(req({ query: { pageSize: "101" } }), context);

    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe("Filtros de búsqueda inválidos");
    expect(svc.listarOportunidades).not.toHaveBeenCalled();
  });
});

describe("GET /pipeline/oportunidades/{id}", () => {
  test("404 uniforme cuando el servicio devuelve null", async () => {
    svc.obtenerOportunidad.mockResolvedValue(null);

    const res: any = await getOportunidad(req({ params: { oportunidadId: "7" } }), context);

    expect(res.status).toBe(404);
    expect(res.jsonBody).toEqual({ message: "Oportunidad no encontrada" });
  });
});

describe("POST /pipeline/oportunidades/{id}/avanzar", () => {
  test("409 con el mensaje de negocio del servicio", async () => {
    svc.avanzarEtapa.mockRejectedValue(
      new svc.PipelineEtapaNoSecuencialError(
        "El avance debe ser a la etapa inmediatamente siguiente del catálogo",
      ),
    );

    const res: any = await avanzarEtapaOportunidad(
      req({
        method: "POST",
        params: { oportunidadId: "7" },
        body: { etapaDestinoCodigo: "CALIFICADO" },
      }),
      context,
    );

    expect(res.status).toBe(409);
    expect(res.jsonBody.message).toMatch(/etapa inmediatamente siguiente/);
  });

  test("400 ante un cuerpo inválido", async () => {
    const res: any = await avanzarEtapaOportunidad(
      req({ method: "POST", params: { oportunidadId: "7" }, body: {} }),
      context,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe("Datos de avance inválidos");
  });
});

describe("POST /pipeline/oportunidades/{id}/perder", () => {
  test("409 cuando la oportunidad ya está cerrada", async () => {
    svc.marcarPerdida.mockRejectedValue(
      new svc.PipelineOportunidadCerradaError(
        "La oportunidad ya está cerrada y no admite cambios de estado",
      ),
    );

    const res: any = await perderOportunidad(
      req({
        method: "POST",
        params: { oportunidadId: "7" },
        body: { motivo: "Sin presupuesto" },
      }),
      context,
    );

    expect(res.status).toBe(409);
    expect(res.jsonBody.message).toMatch(/ya está cerrada/);
  });

  test("400 con fieldErrors.motivo cuando el motivo es demasiado corto", async () => {
    const res: any = await perderOportunidad(
      req({ method: "POST", params: { oportunidadId: "7" }, body: { motivo: "ab" } }),
      context,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.errors.fieldErrors.motivo).toBeDefined();
  });
});
