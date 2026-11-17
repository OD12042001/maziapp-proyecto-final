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
      UniqueIdentifier: "UniqueIdentifier",
      Char: (n: number) => `Char(${n})`,
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      MAX: "MAX",
    },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  completar,
  findByClave,
  liberar,
  reservar,
} from "../idempotencia.repository";

const state = (sqlConfig as any).__state;
const GUID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
});

describe("idempotencia.repository", () => {
  test("reservar inserta EN_PROCESO y devuelve false ante duplicado (NOT EXISTS o 2627)", async () => {
    state.results.push({ rowsAffected: [1] });
    expect(
      await reservar({
        clave: "idem-key-001",
        endpoint: "POST /cierres",
        usuarioId: GUID,
        hashSolicitud: "a".repeat(64),
      }),
    ).toBe(true);

    const dup: any = new Error("UQ_IdempotenciaSolicitudes_Clave");
    dup.number = 2627;
    state.results.push({ reject: dup });
    expect(
      await reservar({
        clave: "idem-key-001",
        endpoint: "POST /cierres",
        usuarioId: GUID,
        hashSolicitud: "a".repeat(64),
      }),
    ).toBe(false);
  });

  test("findByClave normaliza usuarioId en minúsculas y recorta el hash", async () => {
    state.results.push({
      recordset: [
        {
          Clave: "idem-key-001",
          Endpoint: "POST /cierres",
          UsuarioId: GUID.toUpperCase(),
          HashSolicitud: "b".repeat(64),
          Estado: "COMPLETADA",
          CodigoRespuesta: 201,
          CuerpoRespuesta: '{"cierreId":1}',
        },
      ],
    });

    const reg = await findByClave("idem-key-001");
    expect(reg).toEqual({
      clave: "idem-key-001",
      endpoint: "POST /cierres",
      usuarioId: GUID,
      hashSolicitud: "b".repeat(64),
      estado: "COMPLETADA",
      codigoRespuesta: 201,
      cuerpoRespuesta: '{"cierreId":1}',
    });
  });

  test("completar y liberar solo afectan filas EN_PROCESO", async () => {
    state.results.push({ rowsAffected: [1] });
    expect(await completar("idem-key-001", 201, '{"ok":true}')).toBe(true);
    expect(state.queries[0]).toContain("WHERE Clave = @clave AND Estado = N'EN_PROCESO'");

    state.queries.length = 0;
    state.results.push({ rowsAffected: [1] });
    await liberar("idem-key-001");
    expect(state.queries[0]).toContain(
      "DELETE FROM dbo.IdempotenciaSolicitudes",
    );
    expect(state.queries[0]).toContain("WHERE Clave = @clave AND Estado = N'EN_PROCESO'");
  });
});
