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
      BigInt: "BigInt",
      DateTime2: "DateTime2",
      UniqueIdentifier: "UniqueIdentifier",
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      MAX: "MAX",
    },
    __state: state,
    __makeRequest: makeRequest,
  };
});

import * as sqlConfig from "../../../config/sql";
import { ejecutarConContexto, establecerUsuarioEnContexto } from "../../../utils/requestContext";
import {
  findEventoById,
  findEventos,
  registrarEvento,
} from "../auditoria.repository";

const state = (sqlConfig as any).__state;
const makeRequest = (sqlConfig as any).__makeRequest;

const GUID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
});

function inputValue(name: string) {
  const found = state.inputCalls.find(([n]: [string]) => n === name);
  return found ? found[2] : undefined;
}

describe("auditoria.repository (S40)", () => {
  test("registrarEvento toma correlación, usuario, IP y user-agent del contexto activo", async () => {
    const ejecutor = { request: makeRequest };

    await ejecutarConContexto(
      {
        correlationId: "corr-ctx-1",
        direccionIp: "198.51.100.8",
        userAgent: "MaziTest/1.0",
      },
      async () => {
        establecerUsuarioEnContexto({
          oid: GUID,
          name: "Carlos Compliance",
          roles: ["COMPLIANCE"],
        });

        await registrarEvento(ejecutor as any, {
          servicioCodigo: "S12",
          operacion: "DictaminarExpediente",
          entidad: "KycExpediente",
          entidadId: 15,
          resultado: "EXITO",
          valorAnterior: { estado: "EN_PROCESO" },
          valorNuevo: { estado: "VALIDADO" },
          detalle: { observacion: "Todo conforme" },
        });
      },
    );

    expect(state.queries[0]).toContain("INSERT INTO dbo.AuditoriaEventos");
    expect(inputValue("correlationId")).toBe("corr-ctx-1");
    expect(inputValue("usuarioId")).toBe(GUID);
    expect(inputValue("usuarioNombre")).toBe("Carlos Compliance");
    expect(inputValue("rolCodigo")).toBe("compliance");
    expect(inputValue("servicioCodigo")).toBe("S12");
    expect(inputValue("operacion")).toBe("DictaminarExpediente");
    expect(inputValue("entidad")).toBe("KycExpediente");
    expect(inputValue("entidadId")).toBe("15");
    expect(inputValue("resultado")).toBe("EXITO");
    expect(inputValue("valorAnterior")).toBe(JSON.stringify({ estado: "EN_PROCESO" }));
    expect(inputValue("valorNuevo")).toBe(JSON.stringify({ estado: "VALIDADO" }));
    expect(inputValue("detalle")).toBe(JSON.stringify({ observacion: "Todo conforme" }));
    expect(inputValue("direccionIp")).toBe("198.51.100.8");
    expect(inputValue("userAgent")).toBe("MaziTest/1.0");
  });

  test("registrarEvento descarta un oid que no sea GUID sin lanzar error", async () => {
    const ejecutor = { request: makeRequest };

    await registrarEvento(
      ejecutor as any,
      {
        servicioCodigo: "S06",
        operacion: "AvanzarEtapa",
        resultado: "RECHAZO",
      },
      {
        correlationId: "corr-2",
        direccionIp: null,
        userAgent: null,
        usuario: { oid: "oid-no-guid", name: "Dev", roles: [] },
      },
    );

    expect(inputValue("usuarioId")).toBeNull();
    expect(inputValue("rolCodigo")).toBeNull();
  });

  test("findEventos parametriza todos los filtros y mapea la fila cruda con bigint string", async () => {
    state.results.push(
      { recordset: [{ Total: 1 }] },
      {
        recordset: [
          {
            EventoId: "9007199254740995",
            FechaEventoUtc: new Date("2026-11-16T15:00:00.000Z"),
            CorrelationId: "corr-xyz",
            UsuarioId: GUID.toUpperCase(),
            UsuarioNombre: "Admin",
            RolCodigo: "administracion",
            ServicioCodigo: "S06",
            Operacion: "CrearOportunidad",
            Entidad: "Oportunidad",
            EntidadId: "7",
            Resultado: "EXITO",
            ValorAnterior: null,
            ValorNuevo: '{"estado":"ACTIVA"}',
            Detalle: null,
            DireccionIp: "192.0.2.1",
            UserAgent: "Mozilla/5.0",
          },
        ],
      },
    );

    const res = await findEventos({
      servicioCodigo: "S06",
      entidad: "Oportunidad",
      entidadId: "7",
      correlationId: "corr-xyz",
      usuarioId: GUID,
      resultado: "EXITO",
      desde: new Date("2026-11-01T00:00:00.000Z"),
      hasta: new Date("2026-11-17T00:00:00.000Z"),
      page: 2,
      pageSize: 10,
    });

    expect(res.total).toBe(1);
    expect(inputValue("offset")).toBe(10);
    expect(inputValue("pageSize")).toBe(10);
    expect(res.items[0]).toEqual({
      eventoId: "9007199254740995",
      fechaEventoUtc: "2026-11-16T15:00:00.000Z",
      correlationId: "corr-xyz",
      usuarioId: GUID,
      usuarioNombre: "Admin",
      rolCodigo: "administracion",
      servicioCodigo: "S06",
      operacion: "CrearOportunidad",
      entidad: "Oportunidad",
      entidadId: "7",
      resultado: "EXITO",
      valorAnterior: null,
      valorNuevo: { estado: "ACTIVA" },
      detalle: null,
      direccionIp: "192.0.2.1",
      userAgent: "Mozilla/5.0",
    });
  });

  test("findEventoById devuelve null si no existe", async () => {
    state.results.push({ recordset: [] });

    expect(await findEventoById("999")).toBeNull();
    expect(inputValue("eventoId")).toBe("999");
  });
});
