/**
 * kyc.service (S12/S13) — reglas de negocio que dependen de datos ya
 * persistidos:
 *   - visibilidad: compliance ve todo; el freelance solo su cartera;
 *   - un expediente por oportunidad, y solo para oportunidades activas;
 *   - la recepción documental es del freelance asignado, la validación
 *     de documentos y el dictamen son exclusivos de compliance;
 *   - un dictamen VALIDADO exige todos los obligatorios validados;
 *   - el SLA se calcula con el parámetro de la base y se congela en la
 *     fecha de dictamen.
 *
 * El repositorio está mockeado: esta suite prueba decisiones, no SQL.
 */
jest.mock("../../../repositories/kyc/kyc.repository", () => ({
  findDocumentosRequeridos: jest.fn(),
  findDocumentosRequeridosActivos: jest.fn(),
  findOportunidadParaKyc: jest.fn(),
  findExpedienteByOportunidad: jest.fn(),
  findExpedientes: jest.fn(),
  findExpedienteById: jest.fn(),
  findDocumentosByExpediente: jest.fn(),
  saveExpediente: jest.fn(),
  registrarRecepcion: jest.fn(),
  revisarDocumento: jest.fn(),
  contarDocumentosObligatoriosPendientes: jest.fn(),
  dictaminarExpediente: jest.fn(),
  KycExpedienteDuplicadoError: class KycExpedienteDuplicadoError extends Error {},
}));

jest.mock(
  "../../../repositories/configuracion/configuracion.repository",
  () => ({ findParametroEntero: jest.fn() }),
);

import * as repository from "../../../repositories/kyc/kyc.repository";
import * as configuracion from "../../../repositories/configuracion/configuracion.repository";
import * as service from "../kyc.service";

const repo: any = repository;
const config: any = configuracion;

const FREELANCE = {
  oid: "11111111-2222-3333-4444-555555555555",
  name: "Freelance",
  roles: ["ejecutivo_inversion"],
};

const COMPLIANCE = {
  oid: "99999999-8888-7777-6666-555555555555",
  name: "Compliance",
  roles: ["compliance"],
};

const DIA = 24 * 60 * 60 * 1000;

function fechaHace(dias: number): string {
  return new Date(Date.now() - dias * DIA - 60 * 60 * 1000).toISOString();
}

function expediente(overrides: any = {}) {
  return {
    kycExpedienteId: 3,
    oportunidadId: 7,
    contactoId: 20,
    contactoNombre: "Empresa SAC",
    responsableId: FREELANCE.oid.toUpperCase(),
    estado: "PENDIENTE",
    fechaInicioUtc: fechaHace(2),
    fechaDictamenUtc: null,
    dictamenUsuarioId: null,
    dictamenUsuarioNombre: null,
    observacion: null,
    ...overrides,
  };
}

function documento(overrides: any = {}) {
  return {
    kycDocumentoId: 11,
    documentoRequeridoId: 1,
    codigo: "DOC_IDENTIDAD",
    nombre: "Documento de identidad",
    obligatorio: true,
    estado: "PENDIENTE",
    archivoReferencia: null,
    fechaRecepcionUtc: null,
    fechaRevisionUtc: null,
    revisadoPorId: null,
    revisadoPorNombre: null,
    observacion: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  config.findParametroEntero.mockResolvedValue(15);
  repo.findDocumentosByExpediente.mockResolvedValue([]);
});

describe("catálogo", () => {
  test("lista el catálogo completo delegando en el repositorio", async () => {
    repo.findDocumentosRequeridos.mockResolvedValue([]);

    expect(await service.listarDocumentosRequeridos()).toEqual([]);
  });
});

describe("listado de expedientes", () => {
  test("el freelance queda acotado a su cartera y recibe el SLA calculado", async () => {
    repo.findExpedientes.mockResolvedValue({
      items: [expediente()],
      total: 1,
    });

    const resultado = await service.listarExpedientes(FREELANCE as any, {
      page: 1,
      pageSize: 20,
    });

    expect(repo.findExpedientes).toHaveBeenCalledWith({
      estado: undefined,
      contactoId: undefined,
      oportunidadId: undefined,
      responsableId: FREELANCE.oid,
      page: 1,
      pageSize: 20,
    });
    expect(resultado.items[0].sla).toMatchObject({
      umbralDias: 15,
      vencido: false,
    });
    expect((resultado.items[0] as any).responsableId).toBeUndefined();
  });

  test("compliance no queda acotado a ninguna cartera", async () => {
    repo.findExpedientes.mockResolvedValue({ items: [], total: 0 });

    await service.listarExpedientes(COMPLIANCE as any, {
      page: 2,
      pageSize: 10,
    });

    expect(repo.findExpedientes).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: undefined, page: 2, pageSize: 10 }),
    );
  });
});

describe("alta de expediente", () => {
  test("404 uniforme si la oportunidad no existe o no es visible", async () => {
    repo.findOportunidadParaKyc.mockResolvedValue(null);

    expect(
      await service.crearExpediente({ oportunidadId: 7 }, FREELANCE as any),
    ).toBeNull();

    repo.findOportunidadParaKyc.mockResolvedValue({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: COMPLIANCE.oid,
      estado: "ACTIVA",
    });

    expect(
      await service.crearExpediente({ oportunidadId: 7 }, FREELANCE as any),
    ).toBeNull();
  });

  test("409 si la oportunidad ya no está activa", async () => {
    repo.findOportunidadParaKyc.mockResolvedValue({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: FREELANCE.oid,
      estado: "GANADA",
    });

    await expect(
      service.crearExpediente({ oportunidadId: 7 }, FREELANCE as any),
    ).rejects.toBeInstanceOf(service.KycOportunidadNoActivaError);
  });

  test("409 si la oportunidad ya tiene expediente", async () => {
    repo.findOportunidadParaKyc.mockResolvedValue({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: FREELANCE.oid,
      estado: "ACTIVA",
    });
    repo.findExpedienteByOportunidad.mockResolvedValue({ kycExpedienteId: 3 });

    await expect(
      service.crearExpediente({ oportunidadId: 7 }, FREELANCE as any),
    ).rejects.toBeInstanceOf(service.KycExpedienteDuplicadoError);
  });

  test("crea el expediente con su checklist y responde con SLA", async () => {
    repo.findOportunidadParaKyc.mockResolvedValue({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: FREELANCE.oid.toUpperCase(),
      estado: "ACTIVA",
    });
    repo.findExpedienteByOportunidad.mockResolvedValue(null);
    repo.saveExpediente.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);

    const creado = await service.crearExpediente(
      { oportunidadId: 7 },
      FREELANCE as any,
    );

    expect(repo.saveExpediente).toHaveBeenCalledWith({
      oportunidadId: 7,
      contactoId: 20,
      creadoId: FREELANCE.oid,
      creadoNombre: FREELANCE.name,
    });
    expect(creado).toMatchObject({
      kycExpedienteId: 3,
      estado: "PENDIENTE",
      documentos: [documento()],
    });
    expect(creado?.sla.umbralDias).toBe(15);
    expect((creado as any).responsableId).toBeUndefined();
  });

  test("compliance puede crear el expediente de cualquier cartera", async () => {
    repo.findOportunidadParaKyc.mockResolvedValue({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: FREELANCE.oid,
      estado: "ACTIVA",
    });
    repo.findExpedienteByOportunidad.mockResolvedValue(null);
    repo.saveExpediente.mockResolvedValue(expediente());

    expect(
      await service.crearExpediente({ oportunidadId: 7 }, COMPLIANCE as any),
    ).not.toBeNull();
  });
});

describe("recepción de documentos", () => {
  test("404 si el expediente no es visible", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ responsableId: COMPLIANCE.oid }),
    );

    expect(
      await service.registrarRecepcion(
        3,
        {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
        FREELANCE as any,
      ),
    ).toBeNull();
  });

  test("404 si el código no pertenece al checklist del expediente", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);

    expect(
      await service.registrarRecepcion(
        3,
        {
          documentoRequeridoCodigo: "FICHA_RUC",
          archivoReferencia: "https://docs/ruc.pdf",
        },
        FREELANCE as any,
      ),
    ).toBeNull();
  });

  test("409 si el expediente ya fue dictaminado", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ estado: "VALIDADO", fechaDictamenUtc: fechaHace(1) }),
    );
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);

    await expect(
      service.registrarRecepcion(
        3,
        {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
        COMPLIANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });

  test("409 si el documento ya fue validado o rechazado", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.findDocumentosByExpediente.mockResolvedValue([
      documento({ estado: "VALIDADO" }),
    ]);

    await expect(
      service.registrarRecepcion(
        3,
        {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
        FREELANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });

  test("registra la recepción y devuelve el documento releído", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente
      .mockResolvedValueOnce([documento()])
      .mockResolvedValueOnce([
        documento({
          estado: "RECIBIDO",
          archivoReferencia: "https://docs/1.pdf",
        }),
      ]);
    repo.registrarRecepcion.mockResolvedValue(true);

    const actualizado = await service.registrarRecepcion(
      3,
      {
        documentoRequeridoCodigo: "DOC_IDENTIDAD",
        archivoReferencia: "https://docs/1.pdf",
        observacion: "legible",
      },
      FREELANCE as any,
    );

    expect(repo.registrarRecepcion).toHaveBeenCalledWith({
      expedienteId: 3,
      kycDocumentoId: 11,
      archivoReferencia: "https://docs/1.pdf",
      observacion: "legible",
      usuarioId: FREELANCE.oid,
      usuarioNombre: FREELANCE.name,
    });
    expect(actualizado?.estado).toBe("RECIBIDO");
  });

  test("409 si la fila cambió entre la lectura y la escritura", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);
    repo.registrarRecepcion.mockResolvedValue(false);

    await expect(
      service.registrarRecepcion(
        3,
        {
          documentoRequeridoCodigo: "DOC_IDENTIDAD",
          archivoReferencia: "https://docs/1.pdf",
        },
        FREELANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });
});

describe("revisión documental", () => {
  test("el freelance no puede validar un documento (403)", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.findDocumentosByExpediente.mockResolvedValue([
      documento({ estado: "RECIBIDO" }),
    ]);

    await expect(
      service.revisarDocumento(
        3,
        11,
        { estado: "VALIDADO" },
        FREELANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycAccionReservadaError);
  });

  test("el freelance no puede rechazar un documento (403)", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.findDocumentosByExpediente.mockResolvedValue([
      documento({ estado: "RECIBIDO" }),
    ]);

    await expect(
      service.revisarDocumento(
        3,
        11,
        { estado: "RECHAZADO", observacion: "ilegible" },
        FREELANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycAccionReservadaError);
  });

  test("validar exige que el documento esté RECIBIDO (409)", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);

    await expect(
      service.revisarDocumento(
        3,
        11,
        { estado: "VALIDADO" },
        COMPLIANCE as any,
      ),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });

  test("compliance valida un documento recibido y se registra quién revisó", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.findDocumentosByExpediente
      .mockResolvedValueOnce([documento({ estado: "RECIBIDO" })])
      .mockResolvedValueOnce([
        documento({
          estado: "VALIDADO",
          revisadoPorId: COMPLIANCE.oid,
        }),
      ]);
    repo.revisarDocumento.mockResolvedValue(true);

    const actualizado = await service.revisarDocumento(
      3,
      11,
      { estado: "VALIDADO" },
      COMPLIANCE as any,
    );

    expect(repo.revisarDocumento).toHaveBeenCalledWith({
      expedienteId: 3,
      kycDocumentoId: 11,
      estado: "VALIDADO",
      observacion: null,
      usuarioId: COMPLIANCE.oid,
      usuarioNombre: COMPLIANCE.name,
    });
    expect(actualizado?.estado).toBe("VALIDADO");
  });

  test("el freelance puede marcar RECIBIDO por PATCH", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente());
    repo.findDocumentosByExpediente.mockResolvedValue([documento()]);
    repo.revisarDocumento.mockResolvedValue(true);

    await service.revisarDocumento(
      3,
      11,
      { estado: "RECIBIDO" },
      FREELANCE as any,
    );

    expect(repo.revisarDocumento).toHaveBeenCalled();
  });
});

describe("dictamen", () => {
  test("solo compliance puede emitirlo (403)", async () => {
    await expect(
      service.dictaminar(3, { estado: "VALIDADO" }, FREELANCE as any),
    ).rejects.toBeInstanceOf(service.KycAccionReservadaError);

    expect(repo.findExpedienteById).not.toHaveBeenCalled();
  });

  test("404 si el expediente no existe", async () => {
    repo.findExpedienteById.mockResolvedValue(null);

    expect(
      await service.dictaminar(3, { estado: "VALIDADO" }, COMPLIANCE as any),
    ).toBeNull();
  });

  test("409 si el expediente ya tiene dictamen", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ estado: "RECHAZADO", fechaDictamenUtc: fechaHace(1) }),
    );

    await expect(
      service.dictaminar(3, { estado: "VALIDADO" }, COMPLIANCE as any),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });

  test("409 si validar deja documentos obligatorios sin validar", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.contarDocumentosObligatoriosPendientes.mockResolvedValue(2);

    await expect(
      service.dictaminar(3, { estado: "VALIDADO" }, COMPLIANCE as any),
    ).rejects.toBeInstanceOf(service.KycDictamenIncompletoError);

    expect(repo.dictaminarExpediente).not.toHaveBeenCalled();
  });

  test("el rechazo no exige documentos completos y deja fecha de dictamen", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "PENDIENTE" }));
    repo.dictaminarExpediente.mockResolvedValue(
      expediente({
        estado: "RECHAZADO",
        fechaDictamenUtc: new Date().toISOString(),
        dictamenUsuarioId: COMPLIANCE.oid,
        dictamenUsuarioNombre: COMPLIANCE.name,
        observacion: "documentación ilegible",
      }),
    );

    const dictaminado = await service.dictaminar(
      3,
      { estado: "RECHAZADO", observacion: "documentación ilegible" },
      COMPLIANCE as any,
    );

    expect(repo.contarDocumentosObligatoriosPendientes).not.toHaveBeenCalled();
    expect(repo.dictaminarExpediente).toHaveBeenCalledWith({
      expedienteId: 3,
      estado: "RECHAZADO",
      observacion: "documentación ilegible",
      usuarioId: COMPLIANCE.oid,
      usuarioNombre: COMPLIANCE.name,
    });
    expect(dictaminado?.fechaDictamenUtc).not.toBeNull();
  });

  test("409 si el dictamen perdió la carrera contra otra sesión", async () => {
    repo.findExpedienteById.mockResolvedValue(expediente({ estado: "EN_PROCESO" }));
    repo.contarDocumentosObligatoriosPendientes.mockResolvedValue(0);
    repo.dictaminarExpediente.mockResolvedValue(null);

    await expect(
      service.dictaminar(3, { estado: "VALIDADO" }, COMPLIANCE as any),
    ).rejects.toBeInstanceOf(service.KycEstadoNoPermitidoError);
  });
});

describe("SLA (S13)", () => {
  test("vencido cuando los días superan el umbral de la base", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ fechaInicioUtc: fechaHace(16) }),
    );

    const sla = await service.obtenerSla(3, FREELANCE as any);

    expect(sla).toMatchObject({
      diasTranscurridos: 16,
      umbralDias: 15,
      vencido: true,
    });
  });

  test("el día 15 es el último día hábil, todavía no vencido", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ fechaInicioUtc: fechaHace(15) }),
    );

    const sla = await service.obtenerSla(3, FREELANCE as any);

    expect(sla?.diasTranscurridos).toBe(15);
    expect(sla?.vencido).toBe(false);
  });

  test("si hubo dictamen, el reloj se detiene en esa fecha", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({
        estado: "VALIDADO",
        fechaInicioUtc: fechaHace(40),
        fechaDictamenUtc: fechaHace(30),
      }),
    );

    const sla = await service.obtenerSla(3, FREELANCE as any);

    // El proceso duró 10 días y quedó cerrado hace 30: no sigue sumando.
    expect(sla?.diasTranscurridos).toBe(10);
    expect(sla?.vencido).toBe(false);
  });

  test("sin parámetro configurado no inventa un umbral: falla la consulta", async () => {
    config.findParametroEntero.mockResolvedValue(null);
    repo.findExpedienteById.mockResolvedValue(expediente());

    await expect(
      service.obtenerSla(3, FREELANCE as any),
    ).rejects.toBeInstanceOf(service.KycSlaNoConfiguradoError);
  });

  test("404 si el expediente no es visible", async () => {
    repo.findExpedienteById.mockResolvedValue(
      expediente({ responsableId: COMPLIANCE.oid }),
    );

    expect(await service.obtenerSla(3, FREELANCE as any)).toBeNull();
  });
});
