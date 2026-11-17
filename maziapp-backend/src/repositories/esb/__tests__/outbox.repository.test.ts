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
      if (next.reject) {
        throw next.reject;
      }
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
      BigInt: "BigInt",
      DateTime2: "DateTime2",
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      MAX: "MAX",
    },
    __state: state,
    __makeRequest: makeRequest,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findOutbox,
  findOutboxById,
  marcarFallo,
  marcarPublicado,
  publicarEvento,
  reclamarLote,
  registrarConsumo,
} from "../outbox.repository";

const state = (sqlConfig as any).__state;
const makeRequest = (sqlConfig as any).__makeRequest;

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
});

function inputValue(name: string) {
  const found = state.inputCalls.find(([n]: [string]) => n === name);
  return found ? found[2] : undefined;
}

describe("outbox.repository (ESB lógico)", () => {
  test("publicarEvento inserta de forma idempotente por IdempotencyKey", async () => {
    state.results.push({ rowsAffected: [1] });

    const insertado = await publicarEvento(
      { request: makeRequest } as any,
      {
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: 7,
        idempotencyKey: "EtapaCambiada:7:2",
        correlationId: "corr-outbox-1",
        payload: { oportunidadId: 7, etapaDestinoId: 2 },
      },
    );

    expect(insertado).toBe(true);
    expect(state.queries[0]).toContain("WHERE NOT EXISTS");
    expect(inputValue("idempotencyKey")).toBe("EtapaCambiada:7:2");
    expect(inputValue("correlationId")).toBe("corr-outbox-1");
  });

  test("reclamarLote reserva con UPDLOCK/READPAST y ordena por OutboxId", async () => {
    const fecha = new Date("2026-11-16T12:00:00.000Z");
    state.results.push({
      recordset: [
        {
          OutboxId: "20",
          TipoEvento: "KycEstadoCambiado",
          Agregado: "KycExpediente",
          AgregadoId: "3",
          Payload: '{"expedienteId":3}',
          CorrelationId: "corr-2",
          IdempotencyKey: "KycEstadoCambiado:3:VALIDADO",
          Estado: "EN_PROCESO",
          Intentos: 1,
          ProximoIntentoUtc: fecha,
          UltimoError: null,
          CreadoFechaUtc: fecha,
          ProcesadoFechaUtc: null,
        },
        {
          OutboxId: "10",
          TipoEvento: "EtapaCambiada",
          Agregado: "Oportunidad",
          AgregadoId: "7",
          Payload: '{"oportunidadId":7}',
          CorrelationId: "corr-1",
          IdempotencyKey: "EtapaCambiada:7:1",
          Estado: "EN_PROCESO",
          Intentos: 1,
          ProximoIntentoUtc: fecha,
          UltimoError: null,
          CreadoFechaUtc: fecha,
          ProcesadoFechaUtc: null,
        },
      ],
    });

    const lote = await reclamarLote(10);

    expect(state.queries[0]).toContain("WITH (ROWLOCK, UPDLOCK, READPAST)");
    expect(lote.map((e) => e.outboxId)).toEqual(["10", "20"]);
    expect(lote[0].payload).toEqual({ oportunidadId: 7 });
  });

  test("marcarPublicado y marcarFallo exigen Estado = EN_PROCESO", async () => {
    state.results.push({ rowsAffected: [1] });
    expect(await marcarPublicado("10")).toBe(true);
    expect(state.queries[0]).toContain("WHERE OutboxId = @outboxId AND Estado = N'EN_PROCESO'");

    state.results.push({ rowsAffected: [1] });
    const proximo = new Date("2026-11-16T12:05:00.000Z");
    expect(await marcarFallo("10", "Timeout", proximo)).toBe(true);
    expect(inputValue("estado")).toBe("FALLIDO");

    state.inputCalls.length = 0;
    state.results.push({ rowsAffected: [1] });
    expect(await marcarFallo("10", "Agotado", null)).toBe(true);
    expect(inputValue("estado")).toBe("MUERTO");
  });

  test("registrarConsumo devuelve false ante duplicado (NOT EXISTS o error 2627)", async () => {
    state.results.push({ rowsAffected: [0] });
    expect(
      await registrarConsumo({ request: makeRequest } as any, "10", "TrazaAuditoria"),
    ).toBe(false);

    const dup: any = new Error("UQ_OutboxConsumidos_EventoConsumidor");
    dup.number = 2627;
    state.results.push({ reject: dup });
    expect(
      await registrarConsumo({ request: makeRequest } as any, "10", "TrazaAuditoria"),
    ).toBe(false);
  });

  test("findOutbox y findOutboxById consultan y mapean mensajes", async () => {
    const fecha = new Date("2026-11-16T12:00:00.000Z");
    state.results.push(
      { recordset: [{ Total: 1 }] },
      {
        recordset: [
          {
            OutboxId: "15",
            TipoEvento: "EtapaCambiada",
            Agregado: "Oportunidad",
            AgregadoId: "7",
            Payload: '{"oportunidadId":7}',
            CorrelationId: "corr-1",
            IdempotencyKey: "EtapaCambiada:7:1",
            Estado: "PUBLICADO",
            Intentos: 1,
            ProximoIntentoUtc: fecha,
            UltimoError: null,
            CreadoFechaUtc: fecha,
            ProcesadoFechaUtc: fecha,
          },
        ],
      },
    );

    const page = await findOutbox({
      estado: "PUBLICADO",
      tipoEvento: "EtapaCambiada",
      page: 1,
      pageSize: 20,
    });
    expect(page.total).toBe(1);
    expect(page.items[0].outboxId).toBe("15");

    state.results.push({ recordset: [] });
    expect(await findOutboxById("999")).toBeNull();
  });
});
