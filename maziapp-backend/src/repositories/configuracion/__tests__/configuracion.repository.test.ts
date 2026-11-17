/**
 * configuracion.repository.
 *
 * El umbral del SLA de KYC no está codificado: vive en
 * `dbo.ConfiguracionParametros` y este repositorio lo entrega tipado.
 * Se prueba contra la forma cruda de SQL (Valor llega como texto).
 */
jest.mock("../../../config/sql", () => {
  const state: any = { inputCalls: [], queries: [], results: [] as any[] };

  const makeRequest = () => ({
    input(this: any, name: string, type: unknown, value: unknown) {
      state.inputCalls.push([name, type, value]);
      return this;
    },
    async query(text: string) {
      state.queries.push(text);
      const next = state.results.length > 0 ? state.results.shift() : {};

      return { recordset: next.recordset ?? [], rowsAffected: [1] };
    },
  });

  return {
    getPool: async () => ({ request: makeRequest }),
    sql: { NVarChar: (n: number) => `NVarChar(${n})` },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findParametroDecimal,
  findParametroEntero,
} from "../configuracion.repository";

const state: any = (sqlConfig as any).__state;

beforeEach(() => {
  state.inputCalls = [];
  state.queries = [];
  state.results = [];
});

describe("findParametroEntero", () => {
  test("lee el valor como texto y lo devuelve entero", async () => {
    state.results = [{ recordset: [{ Valor: "15", TipoDato: "ENTERO" }] }];

    expect(await findParametroEntero("KYC_SLA_DIAS")).toBe(15);
    expect(state.inputCalls).toEqual([
      ["clave", "NVarChar(100)", "KYC_SLA_DIAS"],
    ]);
  });

  test("ignora parámetros inactivos", async () => {
    state.results = [{ recordset: [{ Valor: "15", TipoDato: "ENTERO" }] }];

    await findParametroEntero("KYC_SLA_DIAS");

    expect(state.queries[0].replace(/\s+/g, " ")).toContain("Activo = 1");
  });

  test("devuelve null si no existe", async () => {
    state.results = [{ recordset: [] }];

    expect(await findParametroEntero("KYC_SLA_DIAS")).toBeNull();
  });

  test("devuelve null si el tipo no es ENTERO o el valor no es entero", async () => {
    state.results = [
      { recordset: [{ Valor: "15", TipoDato: "DECIMAL" }] },
      { recordset: [{ Valor: "quince", TipoDato: "ENTERO" }] },
    ];

    expect(await findParametroEntero("KYC_SLA_DIAS")).toBeNull();
    expect(await findParametroEntero("KYC_SLA_DIAS")).toBeNull();
  });
});

describe("findParametroDecimal", () => {
  test("lee un parámetro DECIMAL y lo devuelve como número", async () => {
    state.results = [{ recordset: [{ Valor: "3.00", TipoDato: "DECIMAL" }] }];

    expect(await findParametroDecimal("COMISION_TASA_PORCENTAJE")).toBe(3);
  });

  test("devuelve null si falta o no es numérico", async () => {
    state.results = [
      { recordset: [] },
      { recordset: [{ Valor: "abc", TipoDato: "DECIMAL" }] },
    ];

    expect(await findParametroDecimal("COMISION_TASA_PORCENTAJE")).toBeNull();
    expect(await findParametroDecimal("COMISION_TASA_PORCENTAJE")).toBeNull();
  });
});
