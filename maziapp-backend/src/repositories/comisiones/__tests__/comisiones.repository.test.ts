jest.mock("../../../config/sql", () => {
  const state: any = {
    inputCalls: [] as Array<[string, unknown, unknown]>,
    queries: [] as string[],
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
      return {
        recordset: next.recordset ?? [],
        rowsAffected: next.rowsAffected ?? [1],
      };
    },
  });

  state.transaction.request = makeRequest;

  const pool = {
    request: makeRequest,
    transaction: () => state.transaction,
  };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      UniqueIdentifier: "UniqueIdentifier",
      DateTime2: "DateTime2",
      Char: (n: number) => `Char(${n})`,
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      Decimal: () => "Decimal",
      MAX: "MAX",
    },
    __state: state,
    __makeRequest: makeRequest,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findComisionByCierre,
  findComisionById,
  findComisiones,
  registrarComisionEnTx,
  revertirComision,
} from "../comisiones.repository";

const state = (sqlConfig as any).__state;
const makeRequest = (sqlConfig as any).__makeRequest;
const GUID = "11111111-2222-3333-4444-555555555555";
const FECHA = new Date("2026-11-16T16:00:00.000Z");

function filaComision(overrides: Record<string, unknown> = {}) {
  return {
    ComisionId: 4,
    CierreId: 10,
    OportunidadId: 7,
    ProyectoNombre: "Expansión retail",
    FreelanceId: GUID.toUpperCase(),
    MonedaCodigo: "PEN ",
    MontoCaptado: "200000.00",
    TasaPorcentaje: "3.00",
    PorcentajeIgv: "18.00",
    ImporteTotal: "6000.00",
    BaseImponible: "5084.75",
    ImporteIgv: "915.25",
    Estado: "PENDIENTE",
    FechaCalculoUtc: FECHA,
    ReversionId: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
  jest.clearAllMocks();
});

describe("comisiones.repository (S16/S17)", () => {
  test("registrarComisionEnTx inserta de forma idempotente, audita S16 y publica ComisionCalculada", async () => {
    state.results.push(
      { rowsAffected: [1] },
      { recordset: [filaComision()] },
      { rowsAffected: [1] },
      { rowsAffected: [1] },
    );

    const com = await registrarComisionEnTx(
      { request: makeRequest } as any,
      {
        cierreId: 10,
        freelanceId: GUID,
        monedaCodigo: "PEN",
        montoCaptado: 200000,
        tasaPorcentaje: 3,
        porcentajeIgv: 18,
        importeTotal: 6000,
        baseImponible: 5084.75,
        importeIgv: 915.25,
      },
      "corr-s16-1",
    );

    expect(com.comisionId).toBe(4);
    expect(com.importeTotal).toBe(6000);
    expect(com.baseImponible + com.importeIgv).toBe(com.importeTotal);
    expect(state.queries[0]).toContain("WHERE NOT EXISTS");
    expect(state.queries.join(" ")).toContain("INSERT INTO dbo.AuditoriaEventos");
    expect(state.queries.join(" ")).toContain("INSERT INTO dbo.OutboxEventos");
  });

  test("registrarComisionEnTx no duplica auditoría ni outbox cuando la comisión ya existía", async () => {
    state.results.push(
      { rowsAffected: [0] },
      { recordset: [filaComision()] },
    );

    const com = await registrarComisionEnTx(
      { request: makeRequest } as any,
      {
        cierreId: 10,
        freelanceId: GUID,
        monedaCodigo: "PEN",
        montoCaptado: 200000,
        tasaPorcentaje: 3,
        porcentajeIgv: 18,
        importeTotal: 6000,
        baseImponible: 5084.75,
        importeIgv: 915.25,
      },
    );

    expect(com.comisionId).toBe(4);
    expect(state.queries).toHaveLength(2);
  });

  test("revertirComision exige Estado = PENDIENTE con rowsAffected = 1 y anexa ComisionReversiones", async () => {
    state.results.push(
      { rowsAffected: [1] },
      { rowsAffected: [1] },
      {
        recordset: [
          filaComision({
            Estado: "REVERTIDA",
            ReversionId: 9,
            ReversionMotivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
            ReversionMotivoDetalle: "Desistimiento",
            ReversionEstadoKyc: "VALIDADO",
            ReversionEstadoDesembolso: "FALLIDO",
            ReversionFechaEvaluacionUtc: FECHA,
            ReversionFechaReversionUtc: FECHA,
            ReversionRegistradoPorId: GUID.toUpperCase(),
            ReversionRegistradoPorNombre: "Admin",
            ReversionObservacion: "Sustento verificado",
          }),
        ],
      },
      { rowsAffected: [1] },
      { rowsAffected: [1] },
    );

    const rev = await revertirComision({
      comisionId: 4,
      motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
      motivoDetalle: "Desistimiento",
      estadoKyc: "VALIDADO",
      estadoDesembolso: "FALLIDO",
      fechaEvaluacionUtc: FECHA,
      observacion: "Sustento verificado",
      usuarioId: GUID,
      usuarioNombre: "Admin",
    });

    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(rev?.estado).toBe("REVERTIDA");
    expect(rev?.reversion?.reversionId).toBe(9);

    state.results.push({ rowsAffected: [0] });
    const perdidaCarrera = await revertirComision({
      comisionId: 4,
      motivoCodigo: "KYC_RECHAZADO",
      motivoDetalle: null,
      estadoKyc: null,
      estadoDesembolso: null,
      fechaEvaluacionUtc: FECHA,
      observacion: null,
      usuarioId: GUID,
      usuarioNombre: "Admin",
    });
    expect(perdidaCarrera).toBeNull();
    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
  });

  test("findComisiones, findComisionById y findComisionByCierre consultan y mapean", async () => {
    state.results.push(
      { recordset: [{ Total: 1 }] },
      { recordset: [filaComision()] },
    );
    const page = await findComisiones({
      estado: "PENDIENTE",
      freelanceId: GUID,
      page: 1,
      pageSize: 20,
    });
    expect(page.total).toBe(1);

    state.results.push({ recordset: [filaComision()] });
    expect((await findComisionByCierre(10))?.comisionId).toBe(4);

    state.results.push({ recordset: [] });
    expect(await findComisionById(999)).toBeNull();
  });
});
