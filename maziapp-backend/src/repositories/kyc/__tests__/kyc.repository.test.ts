/**
 * kyc.repository (S12/S13).
 *
 * Mismo criterio que `pipeline.repository.test.ts`: sin base real en la
 * suite; se mockea `config/sql` y se verifica que
 *   (a) todo valor de usuario viaja como parámetro `.input(...)`,
 *   (b) las lecturas mapean la forma CRUDA que devuelve SQL Server
 *       (columnas con el alias exacto de la query, fechas Date), que es
 *       el defecto que la verificación real de S06 descubrió (L10),
 *   (c) las transiciones de estado usan UPDATE condicional y exigen
 *       `rowsAffected = 1`,
 *   (d) las escrituras multi-tabla corren en transacción.
 */
jest.mock("../../../config/sql", () => {
  const state: any = {
    inputCalls: [],
    queries: [],
    results: [] as any[],
    transaction: {
      begin: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
    },
  };

  const makeRequest = () => ({
    input(this: any, name: string, type: unknown, value: unknown) {
      state.inputCalls.push([name, type, value]);
      return this;
    },
    async query(text: string) {
      state.queries.push(text);
      const next = state.results.length > 0 ? state.results.shift() : {};

      if (next.reject) {
        throw next.reject;
      }

      return {
        recordset: next.recordset ?? [],
        rowsAffected: next.rowsAffected ?? [1],
      };
    },
  });

  state.transaction.request = makeRequest;
  state.requestFactory = makeRequest;

  const pool = {
    request: makeRequest,
    transaction: () => state.transaction,
  };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      BigInt: "BigInt",
      Bit: "Bit",
      UniqueIdentifier: "UniqueIdentifier",
      NVarChar: (n: number) => `NVarChar(${n})`,
      Char: (n: number) => `Char(${n})`,
      Decimal: () => "Decimal",
      DateTime2: "DateTime2",
    },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findDocumentosRequeridos,
  findDocumentosRequeridosActivos,
  findExpedientes,
  findExpedienteById,
  findDocumentosByExpediente,
  findOportunidadParaKyc,
  findExpedienteByOportunidad,
  saveExpediente,
  registrarRecepcion,
  revisarDocumento,
  contarDocumentosObligatoriosPendientes,
  dictaminarExpediente,
  KycExpedienteDuplicadoError,
} from "../kyc.repository";

const state: any = (sqlConfig as any).__state;

function sql(): string {
  return state.queries.join("\n").replace(/\s+/g, " ");
}

function inputs(): Array<[string, unknown, unknown]> {
  return state.inputCalls;
}

function inputValue(name: string): unknown {
  const found = inputs().filter(([n]) => n === name);

  return found.length > 0 ? found[found.length - 1][2] : undefined;
}

const FECHA = new Date("2026-11-16T10:00:00.000Z");

beforeEach(() => {
  state.inputCalls = [];
  state.queries = [];
  state.results = [];
  state.transaction.begin.mockClear();
  state.transaction.commit.mockClear();
  state.transaction.rollback.mockClear();
});

describe("catálogo de documentos requeridos", () => {
  test("devuelve el catálogo completo en orden, con la forma cruda de SQL", async () => {
    state.results = [
      {
        recordset: [
          {
            DocumentoRequeridoId: 1,
            Codigo: "DOC_IDENTIDAD",
            Nombre: "Documento de identidad",
            Descripcion: null,
            Obligatorio: 1,
            Orden: 1,
            Activo: 1,
          },
        ],
      },
    ];

    const [documento] = await findDocumentosRequeridos();

    expect(sql()).toContain("ORDER BY Orden ASC");
    expect(documento).toEqual({
      documentoRequeridoId: 1,
      codigo: "DOC_IDENTIDAD",
      nombre: "Documento de identidad",
      descripcion: null,
      obligatorio: true,
      orden: 1,
      activo: true,
    });
  });

  test("el checklist del expediente se genera solo con documentos activos", async () => {
    await findDocumentosRequeridosActivos();

    expect(sql()).toContain("WHERE Activo = 1");
  });
});

describe("oportunidad origen", () => {
  test("mapea la fila cruda y devuelve null si no existe", async () => {
    state.results = [
      {
        recordset: [
          {
            OportunidadId: 7,
            ContactoId: 20,
            ResponsableId: "ABC-123",
            Estado: "ACTIVA",
          },
        ],
      },
      { recordset: [] },
    ];

    const encontrada = await findOportunidadParaKyc(7);
    const inexistente = await findOportunidadParaKyc(99);

    expect(encontrada).toEqual({
      oportunidadId: 7,
      contactoId: 20,
      responsableId: "ABC-123",
      estado: "ACTIVA",
    });
    expect(inexistente).toBeNull();
    expect(inputValue("oportunidadId")).toBe(99);
  });

  test("detecta el expediente ya existente de una oportunidad", async () => {
    state.results = [{ recordset: [{ KycExpedienteId: 3 }] }];

    const existente = await findExpedienteByOportunidad(7);

    expect(existente).toEqual({ kycExpedienteId: 3 });
    expect(sql()).toContain("WHERE OportunidadId = @oportunidadId");
  });
});

describe("expedientes", () => {
  test("el listado pagina con OFFSET/FETCH y parametriza cada filtro", async () => {
    state.results = [
      { recordset: [{ Total: 1 }] },
      {
        recordset: [
          {
            KycExpedienteId: 3,
            OportunidadId: 7,
            ContactoId: 20,
            ContactoNombre: "Empresa SAC",
            ResponsableId: "abc",
            Estado: "PENDIENTE",
            FechaInicioUtc: FECHA,
            FechaDictamenUtc: null,
            DictamenUsuarioId: null,
            DictamenUsuarioNombre: null,
            Observacion: null,
          },
        ],
      },
    ];

    const resultado = await findExpedientes({
      estado: "PENDIENTE",
      oportunidadId: 7,
      responsableId: "abc",
      page: 2,
      pageSize: 10,
    });

    expect(sql()).toContain("WHERE e.Estado = @estado AND e.OportunidadId = @oportunidadId");
    expect(sql()).toContain("o.ResponsableId = @responsableId");
    expect(sql()).toContain("OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY");
    expect(inputValue("estado")).toBe("PENDIENTE");
    expect(inputValue("responsableId")).toBe("abc");
    expect(inputValue("offset")).toBe(10);

    expect(resultado.total).toBe(1);
    expect(resultado.items[0]).toMatchObject({
      kycExpedienteId: 3,
      oportunidadId: 7,
      contactoId: 20,
      contactoNombre: "Empresa SAC",
      responsableId: "abc",
      estado: "PENDIENTE",
      fechaInicioUtc: "2026-11-16T10:00:00.000Z",
      fechaDictamenUtc: null,
    });
  });

  test("sin filtros no inventa un WHERE", async () => {
    state.results = [{ recordset: [{ Total: 0 }] }, { recordset: [] }];

    await findExpedientes({ page: 1, pageSize: 20 });

    expect(sql()).not.toContain("WHERE");
    expect(sql()).toContain("ORDER BY e.FechaInicioUtc DESC");
  });

  test("el detalle devuelve null cuando el id no existe", async () => {
    state.results = [{ recordset: [] }];

    expect(await findExpedienteById(999)).toBeNull();
    expect(inputValue("kycExpedienteId")).toBe(999);
  });

  test("el checklist mapea la forma cruda con los datos del catálogo", async () => {
    state.results = [
      {
        recordset: [
          {
            KycDocumentoId: 11,
            DocumentoRequeridoId: 1,
            Codigo: "DOC_IDENTIDAD",
            Nombre: "Documento de identidad",
            Obligatorio: 1,
            Estado: "RECIBIDO",
            ArchivoReferencia: "https://docs/1.pdf",
            FechaRecepcionUtc: FECHA,
            FechaRevisionUtc: null,
            RevisadoPorId: null,
            RevisadoPorNombre: null,
            Observacion: null,
          },
        ],
      },
    ];

    const [documento] = await findDocumentosByExpediente(3);

    expect(documento).toEqual({
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
    });
  });
});

describe("alta de expediente", () => {
  test("inserta expediente y checklist en una transacción y relee antes del commit", async () => {
    state.results = [
      { recordset: [{ KycExpedienteId: 3 }] },
      { recordset: [] },
      {
        recordset: [
          {
            KycExpedienteId: 3,
            OportunidadId: 7,
            ContactoId: 20,
            ContactoNombre: "Empresa SAC",
            ResponsableId: "abc",
            Estado: "PENDIENTE",
            FechaInicioUtc: FECHA,
            FechaDictamenUtc: null,
            DictamenUsuarioId: null,
            DictamenUsuarioNombre: null,
            Observacion: null,
          },
        ],
      },
    ];

    const expediente = await saveExpediente({
      oportunidadId: 7,
      contactoId: 20,
      creadoId: "user-1",
      creadoNombre: "Usuario",
    });

    expect(state.transaction.begin).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(state.transaction.rollback).not.toHaveBeenCalled();
    expect(sql()).toContain("INSERT INTO dbo.KycDocumentos");
    expect(sql()).toContain("WHERE r.Activo = 1");
    expect(expediente.kycExpedienteId).toBe(3);
  });

  test("traduce la violación UNIQUE de la oportunidad a un error de negocio", async () => {
    const duplicate: any = new Error("duplicate");
    duplicate.number = 2627;

    state.results = [{ reject: duplicate }];

    await expect(
      saveExpediente({
        oportunidadId: 7,
        contactoId: 20,
        creadoId: "user-1",
        creadoNombre: "Usuario",
      }),
    ).rejects.toBeInstanceOf(KycExpedienteDuplicadoError);

    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).not.toHaveBeenCalled();
  });
});

describe("transiciones de estado", () => {
  test("la recepción es un UPDATE condicional que exige fila afectada", async () => {
    state.results = [{ rowsAffected: [1] }, { rowsAffected: [1] }];

    const ok = await registrarRecepcion({
      expedienteId: 3,
      kycDocumentoId: 11,
      archivoReferencia: "https://docs/1.pdf",
      observacion: null,
      usuarioId: "user-1",
      usuarioNombre: "Usuario",
    });

    expect(ok).toBe(true);
    expect(sql()).toContain("Estado IN (N'PENDIENTE', N'RECIBIDO')");
    expect(sql()).toContain("UPDATE dbo.KycDocumentos");
  });

  test("si la fila cambió entre la lectura y la escritura, la recepción falla", async () => {
    state.results = [{ rowsAffected: [0] }];

    const ok = await registrarRecepcion({
      expedienteId: 3,
      kycDocumentoId: 11,
      archivoReferencia: "https://docs/1.pdf",
      observacion: null,
      usuarioId: "user-1",
      usuarioNombre: "Usuario",
    });

    expect(ok).toBe(false);
    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
  });

  test("validar un documento exige que esté RECIBIDO", async () => {
    state.results = [{ rowsAffected: [1] }, { rowsAffected: [0] }];

    await revisarDocumento({
      expedienteId: 3,
      kycDocumentoId: 11,
      estado: "VALIDADO",
      observacion: null,
      usuarioId: "user-1",
      usuarioNombre: "Usuario",
    });

    expect(sql()).toContain("Estado = N'RECIBIDO'");
  });
});

describe("dictamen", () => {
  test("cuenta los obligatorios no validados del expediente", async () => {
    state.results = [{ recordset: [{ Pendientes: 2 }] }];

    const pendientes = await contarDocumentosObligatoriosPendientes(3);

    expect(pendientes).toBe(2);
    expect(sql()).toContain("r.Obligatorio = 1");
    expect(sql()).toContain("d.Estado <> N'VALIDADO'");
  });

  test("actualiza el dictamen con fecha en la misma sentencia y exige estado abierto", async () => {
    state.results = [
      { rowsAffected: [1] },
      {
        recordset: [
          {
            KycExpedienteId: 3,
            OportunidadId: 7,
            ContactoId: 20,
            ContactoNombre: "Empresa SAC",
            ResponsableId: "abc",
            Estado: "VALIDADO",
            FechaInicioUtc: FECHA,
            FechaDictamenUtc: FECHA,
            DictamenUsuarioId: "user-2",
            DictamenUsuarioNombre: "Compliance",
            Observacion: null,
          },
        ],
      },
    ];

    const expediente = await dictaminarExpediente({
      expedienteId: 3,
      estado: "VALIDADO",
      observacion: null,
      usuarioId: "user-2",
      usuarioNombre: "Compliance",
    });

    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(sql()).toContain("FechaDictamenUtc = SYSUTCDATETIME()");
    expect(sql()).toContain("AND Estado IN (N'PENDIENTE', N'EN_PROCESO')");
    expect(expediente?.estado).toBe("VALIDADO");
  });

  test("un dictamen que perdió la carrera no se confirma", async () => {
    state.results = [{ rowsAffected: [0] }];

    const expediente = await dictaminarExpediente({
      expedienteId: 3,
      estado: "RECHAZADO",
      observacion: "documentación ilegible",
      usuarioId: "user-2",
      usuarioNombre: "Compliance",
    });

    expect(expediente).toBeNull();
    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
  });
});
