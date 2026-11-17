jest.mock("../../../config/sql", () => {
  const state: any = {
    inputCalls: [] as Array<[string, unknown, unknown]>,
    queries: [] as string[],
    results: [] as any[],
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

  const pool = { request: makeRequest };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      Bit: "Bit",
      UniqueIdentifier: "UniqueIdentifier",
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      MAX: "MAX",
    },
    __state: state,
    __makeRequest: makeRequest,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  actualizarEstadoInstanciaEnTx,
  actualizarPasoEnTx,
  asegurarSagaEnTx,
  compensarOportunidadPorKycRechazadoEnTx,
  DEFINICION_PASOS_SAGA,
  findSagaByCorrelationId,
} from "../saga.repository";

const state = (sqlConfig as any).__state;
const makeRequest = (sqlConfig as any).__makeRequest;
const SAGA_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const GUID = "11111111-2222-3333-4444-555555555555";
const FECHA = new Date("2026-11-16T17:00:00.000Z");

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
});

describe("saga.repository (S4)", () => {
  test("asegurarSagaEnTx reutiliza la instancia existente o crea una nueva con sus 4 pasos", async () => {
    state.results.push({ recordset: [{ SagaInstanciaId: SAGA_ID.toUpperCase() }] });
    const existente = await asegurarSagaEnTx(
      { request: makeRequest } as any,
      7,
      "corr-saga-1",
    );
    expect(existente).toBe(SAGA_ID);
    expect(state.queries).toHaveLength(1);

    state.queries.length = 0;
    state.results.push(
      { recordset: [] }, // no existe para oportunidadId
      { recordset: [] }, // no colisiona correlationId
      { recordset: [{ SagaInstanciaId: SAGA_ID.toUpperCase() }] }, // insert instancia
      { rowsAffected: [1] },
      { rowsAffected: [1] },
      { rowsAffected: [1] },
      { rowsAffected: [1] },
    );

    const creada = await asegurarSagaEnTx(
      { request: makeRequest } as any,
      8,
      "corr-saga-2",
    );
    expect(creada).toBe(SAGA_ID);
    expect(state.queries).toHaveLength(3 + DEFINICION_PASOS_SAGA.length);
  });

  test("actualizarPasoEnTx, actualizarEstadoInstanciaEnTx y compensarOportunidadPorKycRechazadoEnTx ejecutan SQL parametrizado", async () => {
    const tx: any = { request: makeRequest };
    await actualizarPasoEnTx(tx, SAGA_ID, 2, {
      estado: "COMPLETADO",
      payload: { expedienteId: 3 },
    });
    expect(state.queries[0]).toContain("UPDATE dbo.SagaPasos");

    state.queries.length = 0;
    await actualizarEstadoInstanciaEnTx(tx, SAGA_ID, {
      pasoActual: 4,
      estado: "COMPLETADA",
      finalizada: true,
    });
    expect(state.queries[0]).toContain("UPDATE dbo.SagaInstancias");

    state.queries.length = 0;
    state.results.push({ rowsAffected: [1] }, { rowsAffected: [1] });
    await compensarOportunidadPorKycRechazadoEnTx(tx, 7, "corr-comp-1");
    expect(state.queries[0]).toContain("UPDATE dbo.Oportunidades");
    expect(state.queries[1]).toContain("INSERT INTO dbo.AuditoriaEventos");
  });

  test("findSagaByCorrelationId mapea instancia y pasos ordenados con sagaPasoId como string", async () => {
    state.results.push(
      {
        recordset: [
          {
            SagaInstanciaId: SAGA_ID.toUpperCase(),
            CorrelationId: "corr-saga-1",
            OportunidadId: 7,
            ResponsableId: GUID.toUpperCase(),
            Proceso: "KYC_CIERRE_COMISION",
            Estado: "COMPLETADA",
            PasoActual: 4,
            IniciadaUtc: FECHA,
            FinalizadaUtc: FECHA,
            UltimoError: null,
          },
        ],
      },
      {
        recordset: [
          {
            SagaPasoId: "101",
            Orden: 1,
            ServicioCodigo: "S06",
            Accion: "AperturaYAvancePipeline",
            Estado: "COMPLETADO",
            IniciadoUtc: FECHA,
            FinalizadoUtc: FECHA,
            Error: null,
          },
        ],
      },
    );

    const saga = await findSagaByCorrelationId("corr-saga-1");
    expect(saga?.sagaInstanciaId).toBe(SAGA_ID);
    expect(saga?.pasos[0].sagaPasoId).toBe("101");

    state.results.push({ recordset: [] });
    expect(await findSagaByCorrelationId("inexistente")).toBeNull();
  });
});
