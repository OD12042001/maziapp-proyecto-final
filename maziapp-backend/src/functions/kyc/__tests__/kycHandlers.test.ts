/**
 * Comportamiento HTTP de los handlers de KYC (S12/S13): códigos de
 * estado y forma del cuerpo de error, con `withAuth`/`withCors`
 * neutralizados y el servicio mockeado. El registro de rutas y la
 * matriz de roles viven en `kycRouting.test.ts`.
 */
jest.mock("@azure/functions", () => ({ app: { http: jest.fn() } }));

jest.mock("../../../middleware/withAuth", () => ({
  withAuth: (_roles: string[], handler: unknown) => handler,
}));

jest.mock("../../../middleware/withCors", () => ({
  withCors: (handler: unknown) => handler,
}));

jest.mock("../../../services/kyc/kyc.service", () => ({
  listarDocumentosRequeridos: jest.fn(),
  listarExpedientes: jest.fn(),
  crearExpediente: jest.fn(),
  obtenerExpediente: jest.fn(),
  registrarRecepcion: jest.fn(),
  revisarDocumento: jest.fn(),
  dictaminar: jest.fn(),
  obtenerSla: jest.fn(),
  KycExpedienteDuplicadoError: class KycExpedienteDuplicadoError extends Error {},
  KycOportunidadNoActivaError: class KycOportunidadNoActivaError extends Error {},
  KycEstadoNoPermitidoError: class KycEstadoNoPermitidoError extends Error {},
  KycDictamenIncompletoError: class KycDictamenIncompletoError extends Error {},
  KycSlaNoConfiguradoError: class KycSlaNoConfiguradoError extends Error {},
  KycAccionReservadaError: class KycAccionReservadaError extends Error {},
}));

const svc: any = require("../../../services/kyc/kyc.service");

const { getDocumentosRequeridosKyc } = require("../getDocumentosRequeridosKyc");
const { getExpedientesKyc } = require("../getExpedientesKyc");
const { createExpedienteKyc } = require("../createExpedienteKyc");
const { getExpedienteKyc } = require("../getExpedienteKyc");
const { registrarDocumentoKyc } = require("../registrarDocumentoKyc");
const { revisarDocumentoKyc } = require("../revisarDocumentoKyc");
const { dictaminarExpedienteKyc } = require("../dictaminarExpedienteKyc");
const { getSlaKyc } = require("../getSlaKyc");

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

const SLA = {
  diasTranscurridos: 3,
  umbralDias: 15,
  vencido: false,
  fechaCorteUtc: "2026-11-16T10:00:00.000Z",
};

const EXPEDIENTE = {
  kycExpedienteId: 3,
  oportunidadId: 7,
  contactoId: 20,
  contactoNombre: "Empresa SAC",
  estado: "PENDIENTE",
  fechaInicioUtc: "2026-11-13T10:00:00.000Z",
  fechaDictamenUtc: null,
  dictamenUsuarioId: null,
  dictamenUsuarioNombre: null,
  observacion: null,
  sla: SLA,
  documentos: [],
};

const DOCUMENTO = {
  kycDocumentoId: 11,
  documentoRequeridoId: 1,
  codigo: "DOC_IDENTIDAD",
  nombre: "Documento de identidad",
  obligatorio: true,
  estado: "RECIBIDO",
  archivoReferencia: "https://docs/1.pdf",
  fechaRecepcionUtc: "2026-11-16T10:00:00.000Z",
  fechaRevisionUtc: null,
  revisadoPorId: null,
  revisadoPorNombre: null,
  observacion: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /kyc/documentos-requeridos", () => {
  test("200 con el catálogo", async () => {
    svc.listarDocumentosRequeridos.mockResolvedValue([]);

    const res: any = await getDocumentosRequeridosKyc(req(), context);

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual([]);
  });

  test("500 si el repositorio falla", async () => {
    svc.listarDocumentosRequeridos.mockRejectedValue(new Error("db"));

    const res: any = await getDocumentosRequeridosKyc(req(), context);

    expect(res.status).toBe(500);
  });
});

describe("GET /kyc/expedientes", () => {
  test("200 con eco de X-Correlation-Id", async () => {
    svc.listarExpedientes.mockResolvedValue({
      items: [EXPEDIENTE],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    const res: any = await getExpedientesKyc(
      req({ query: { estado: "PENDIENTE" }, headers: { "x-correlation-id": "corr-9" } }),
      context,
    );

    expect(res.status).toBe(200);
    expect(res.headers["X-Correlation-Id"]).toBe("corr-9");
    expect(res.jsonBody.total).toBe(1);
  });

  test("400 si el filtro de estado no pertenece al contrato", async () => {
    const res: any = await getExpedientesKyc(
      req({ query: { estado: "APROBADO" } }),
      context,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.errors.fieldErrors.estado).toBeDefined();
  });
});

describe("POST /kyc/expedientes", () => {
  test("201 con el expediente creado", async () => {
    svc.crearExpediente.mockResolvedValue(EXPEDIENTE);

    const res: any = await createExpedienteKyc(
      req({ method: "POST", body: { oportunidadId: 7 } }),
      context,
      USER,
    );

    expect(res.status).toBe(201);
    expect(res.jsonBody.kycExpedienteId).toBe(3);
  });

  test("400 con cuerpo inválido", async () => {
    const res: any = await createExpedienteKyc(
      req({ method: "POST", body: { oportunidadId: 0 } }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
  });

  test("400 si el cuerpo no es JSON", async () => {
    const res: any = await createExpedienteKyc(
      req({ method: "POST" }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toBe("Cuerpo JSON inválido");
  });

  test("404 uniforme si la oportunidad no es visible", async () => {
    svc.crearExpediente.mockResolvedValue(null);

    const res: any = await createExpedienteKyc(
      req({ method: "POST", body: { oportunidadId: 7 } }),
      context,
      USER,
    );

    expect(res.status).toBe(404);
  });

  test("409 si la oportunidad ya tiene expediente", async () => {
    svc.crearExpediente.mockRejectedValue(
      new svc.KycExpedienteDuplicadoError("ya existe"),
    );

    const res: any = await createExpedienteKyc(
      req({ method: "POST", body: { oportunidadId: 7 } }),
      context,
      USER,
    );

    expect(res.status).toBe(409);
    expect(res.jsonBody.message).toBe("ya existe");
  });

  test("409 si la oportunidad está cerrada", async () => {
    svc.crearExpediente.mockRejectedValue(
      new svc.KycOportunidadNoActivaError("cerrada"),
    );

    const res: any = await createExpedienteKyc(
      req({ method: "POST", body: { oportunidadId: 7 } }),
      context,
      USER,
    );

    expect(res.status).toBe(409);
  });
});

describe("GET /kyc/expedientes/{id}", () => {
  test("200 con el detalle", async () => {
    svc.obtenerExpediente.mockResolvedValue(EXPEDIENTE);

    const res: any = await getExpedienteKyc(
      req({ params: { expedienteId: "3" } }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(svc.obtenerExpediente).toHaveBeenCalledWith("3", USER);
  });

  test("404 si no existe o no es visible", async () => {
    svc.obtenerExpediente.mockResolvedValue(null);

    const res: any = await getExpedienteKyc(
      req({ params: { expedienteId: "3" } }),
      context,
      USER,
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /kyc/expedientes/{id}/documentos", () => {
  test("201 con el documento recibido", async () => {
    svc.registrarRecepcion.mockResolvedValue(DOCUMENTO);

    const res: any = await registrarDocumentoKyc(
      req({
        method: "POST",
        params: { expedienteId: "3" },
        body: {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(201);
    expect(res.jsonBody.estado).toBe("RECIBIDO");
  });

  test("400 si falta la referencia del archivo", async () => {
    const res: any = await registrarDocumentoKyc(
      req({
        method: "POST",
        params: { expedienteId: "3" },
        body: { documentoRequeridoCodigo: "DOC_IDENTIDAD" },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
  });

  test("404 si el documento no pertenece al checklist", async () => {
    svc.registrarRecepcion.mockResolvedValue(null);

    const res: any = await registrarDocumentoKyc(
      req({
        method: "POST",
        params: { expedienteId: "3" },
        body: {
          documentoRequeridoCodigo: "OTRO",
          archivoReferencia: "https://docs/1.pdf",
        },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(404);
  });

  test("409 si el expediente ya está dictaminado", async () => {
    svc.registrarRecepcion.mockRejectedValue(
      new svc.KycEstadoNoPermitidoError("dictaminado"),
    );

    const res: any = await registrarDocumentoKyc(
      req({
        method: "POST",
        params: { expedienteId: "3" },
        body: {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(409);
  });
});

describe("PATCH /kyc/expedientes/{id}/documentos/{docId}", () => {
  test("200 al validar como compliance", async () => {
    svc.revisarDocumento.mockResolvedValue({ ...DOCUMENTO, estado: "VALIDADO" });

    const res: any = await revisarDocumentoKyc(
      req({ method: "PATCH", params: { expedienteId: "3", documentoId: "11" }, body: { estado: "VALIDADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(svc.revisarDocumento).toHaveBeenCalledWith("3", "11", { estado: "VALIDADO" }, USER);
  });

  test("400 si rechaza sin observación", async () => {
    const res: any = await revisarDocumentoKyc(
      req({ method: "PATCH", params: { expedienteId: "3", documentoId: "11" }, body: { estado: "RECHAZADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
    expect(res.jsonBody.errors.fieldErrors.observacion).toBeDefined();
  });

  test("403 si el rol no puede validar documentos", async () => {
    svc.revisarDocumento.mockRejectedValue(
      new svc.KycAccionReservadaError("Solo compliance"),
    );

    const res: any = await revisarDocumentoKyc(
      req({ method: "PATCH", params: { expedienteId: "3", documentoId: "11" }, body: { estado: "VALIDADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(403);
    expect(res.jsonBody.error).toBe("Forbidden");
  });

  test("404 si el documento no existe en el expediente", async () => {
    svc.revisarDocumento.mockResolvedValue(null);

    const res: any = await revisarDocumentoKyc(
      req({ method: "PATCH", params: { expedienteId: "3", documentoId: "99" }, body: { estado: "RECIBIDO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /kyc/expedientes/{id}/dictamen", () => {
  test("200 con el expediente dictaminado y eco de correlación", async () => {
    svc.dictaminar.mockResolvedValue({
      ...EXPEDIENTE,
      estado: "VALIDADO",
      fechaDictamenUtc: "2026-11-16T11:00:00.000Z",
    });

    const res: any = await dictaminarExpedienteKyc(
      req({
        method: "POST",
        params: { expedienteId: "3" },
        body: { estado: "VALIDADO" },
        headers: { "x-correlation-id": "corr-kyc" },
      }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(res.headers["X-Correlation-Id"]).toBe("corr-kyc");
    expect(res.jsonBody.estado).toBe("VALIDADO");
  });

  test("400 si el dictamen no es final", async () => {
    const res: any = await dictaminarExpedienteKyc(
      req({ method: "POST", params: { expedienteId: "3" }, body: { estado: "EN_PROCESO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(400);
  });

  test("409 si faltan documentos obligatorios", async () => {
    svc.dictaminar.mockRejectedValue(
      new svc.KycDictamenIncompletoError("faltan 2 documentos"),
    );

    const res: any = await dictaminarExpedienteKyc(
      req({ method: "POST", params: { expedienteId: "3" }, body: { estado: "VALIDADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(409);
    expect(res.jsonBody.message).toBe("faltan 2 documentos");
  });

  test("403 si el rol no es compliance", async () => {
    svc.dictaminar.mockRejectedValue(
      new svc.KycAccionReservadaError("Solo compliance"),
    );

    const res: any = await dictaminarExpedienteKyc(
      req({ method: "POST", params: { expedienteId: "3" }, body: { estado: "VALIDADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(403);
  });

  test("500 si el SLA no está configurado (no se inventa el umbral)", async () => {
    svc.dictaminar.mockRejectedValue(
      new svc.KycSlaNoConfiguradoError("sin parámetro"),
    );

    const res: any = await dictaminarExpedienteKyc(
      req({ method: "POST", params: { expedienteId: "3" }, body: { estado: "VALIDADO" } }),
      context,
      USER,
    );

    expect(res.status).toBe(500);
  });
});

describe("GET /kyc/expedientes/{id}/sla", () => {
  test("200 con el SLA calculado", async () => {
    svc.obtenerSla.mockResolvedValue(SLA);

    const res: any = await getSlaKyc(
      req({ params: { expedienteId: "3" } }),
      context,
      USER,
    );

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual(SLA);
  });

  test("404 si el expediente no es visible", async () => {
    svc.obtenerSla.mockResolvedValue(null);

    const res: any = await getSlaKyc(
      req({ params: { expedienteId: "3" } }),
      context,
      USER,
    );

    expect(res.status).toBe(404);
  });
});

// Este archivo usa `require` y no importaciones ESM: la marca explícita
// de módulo evita que sus helpers compartan el ámbito global con los de
// otros tests que siguen el mismo patrón.
export {};
