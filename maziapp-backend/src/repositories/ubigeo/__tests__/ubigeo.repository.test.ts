/**
 * Fase Direcciones -- protección contra SQL injection (mismo criterio
 * que representante.repository.test.ts): sin base de datos real
 * disponible en este entorno de pruebas, se verifica a nivel de código
 * que (a) el texto de la query enviada a `mssql` es un literal
 * estático parametrizado, y (b) todo valor de usuario llega
 * ÚNICAMENTE mediante `.input(...)`, nunca concatenado en el texto de
 * la query -- incluyendo un intento explícito de inyección SQL en el
 * parámetro `search` del autocompletado.
 */
import { buscarDistritos, findDistritoById } from "../ubigeo.repository";

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
      VarChar: (n: number) => `VarChar(${n})`,
      Int: "Int",
    },
  };
});

describe("ubigeo.repository -> buscarDistritos (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [
      {
        IdDistrito: 1501,
        Distrito: "MIRAFLORES",
        Provincia: "LIMA",
        Departamento: "LIMA",
      },
    ];
  });

  test("un search con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado en el texto de la query", async () => {
    const payloadMalicioso = "lima'; DROP TABLE dbo.Distritos;--";

    await buscarDistritos(payloadMalicioso);

    expect(queryText).toContain("@search");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const searchInput = inputCalls.find(([name]) => name === "search");
    expect(searchInput).toBeDefined();
    // El valor viaja como parámetro (envuelto en '%...%' para el LIKE)
    // -- nunca se ejecuta como SQL, solo se compara como texto.
    expect(String(searchInput?.[2])).toContain(payloadMalicioso);
  });

  test("la query hace JOIN de Distritos -> Provincias -> Departamentos y filtra solo filas activas", async () => {
    await buscarDistritos("lima");

    expect(queryText).toMatch(/JOIN dbo\.Provincias/i);
    expect(queryText).toMatch(/JOIN dbo\.Departamentos/i);
    expect(queryText).toContain("di.Activo = 1");
    expect(queryText).toContain("p.Activo = 1");
    expect(queryText).toContain("d.Activo = 1");
  });

  test("la búsqueda se ejecuta en SQL Server (nunca fetch-all + filtrado en Node) -- la query siempre lleva WHERE ... LIKE @search", async () => {
    await buscarDistritos("lima");

    expect(queryText).toMatch(/WHERE[\s\S]*LIKE @search/i);
  });

  test("devuelve la forma mínima {idDistrito, distrito, provincia, departamento}", async () => {
    const res = await buscarDistritos("miraflores");

    expect(res).toEqual([
      { idDistrito: 1501, distrito: "MIRAFLORES", provincia: "LIMA", departamento: "LIMA" },
    ]);
  });

  test("sin resultados -> arreglo vacío", async () => {
    nextRecordset = [];

    const res = await buscarDistritos("zzzzz");

    expect(res).toEqual([]);
  });
});

describe("ubigeo.repository -> findDistritoById", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("idDistrito viaja como parámetro tipado, nunca concatenado", async () => {
    nextRecordset = [
      { IdDistrito: 1501, Distrito: "MIRAFLORES", Provincia: "LIMA", Departamento: "LIMA" },
    ];

    await findDistritoById(1501);

    expect(queryText).toContain("@idDistrito");
    const idInput = inputCalls.find(([name]) => name === "idDistrito");
    expect(idInput?.[2]).toBe(1501);
  });

  test("distrito inexistente o inactivo -> null", async () => {
    nextRecordset = [];

    const res = await findDistritoById(999999);

    expect(res).toBeNull();
  });
});
