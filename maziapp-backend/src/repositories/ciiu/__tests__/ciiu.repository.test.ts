/**
 * Fase Actividad -- ciiu.repository.ts (catálogo de solo lectura).
 * Mismo criterio que ubigeo.repository.test.ts: parametrización y
 * búsqueda por código O descripción.
 */
import { buscarCiiu, findCiiuById } from "../ciiu.repository";

const inputCalls: Array<[string, unknown, unknown]> = [];
let queryText = "";
let nextRecordset: any[] = [];

jest.mock("../../../config/sql", () => {
  const request = {
    input: jest.fn(function (this: any, name: string, type: unknown, value: unknown) {
      inputCalls.push([name, type, value]);
      return this;
    }),
    query: jest.fn(async (text: string) => {
      queryText = text;
      return { recordset: nextRecordset };
    }),
  };

  const pool = { request: () => request };

  return {
    getPool: async () => pool,
    sql: {
      NVarChar: (n: number) => `NVarChar(${n})`,
      Int: "Int",
    },
  };
});

describe("ciiu.repository -> buscarCiiu", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [{ CiiuId: 1, Codigo: "6201", Descripcion: "Programación informática" }];
  });

  test("filtra por Activo = 1 y busca por Codigo O Descripcion, parametrizado", async () => {
    await buscarCiiu("programa");

    expect(queryText).toContain("Activo = 1");
    expect(queryText).toContain("Codigo LIKE @search");
    expect(queryText).toContain("Descripcion LIKE @search");
    expect(queryText).not.toContain("programa");
  });

  test("mapea el resultado a {ciiuId, codigo, descripcion}", async () => {
    const res = await buscarCiiu("programa");
    expect(res).toEqual([{ ciiuId: 1, codigo: "6201", descripcion: "Programación informática" }]);
  });
});

describe("ciiu.repository -> findCiiuById", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [];
  });

  test("devuelve null cuando no existe / no está activo", async () => {
    const res = await findCiiuById(999);
    expect(res).toBeNull();
  });

  test("devuelve el CIIU cuando existe y está activo, ciiuId parametrizado", async () => {
    nextRecordset = [{ CiiuId: 12, Codigo: "6201", Descripcion: "Programación informática" }];

    const res = await findCiiuById(12);

    expect(queryText).toContain("@ciiuId");
    expect(queryText).toContain("Activo = 1");
    expect(res).toEqual({ ciiuId: 12, codigo: "6201", descripcion: "Programación informática" });
  });
});
