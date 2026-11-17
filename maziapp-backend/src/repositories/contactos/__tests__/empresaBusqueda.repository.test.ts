/**
 * Fase Actividad -- empresaBusqueda.repository.ts
 *
 * Cubre parametrización (nunca concatenación) Y, sobre todo, la regla
 * de seguridad explícita: la búsqueda SIEMPRE filtra por
 * ResponsableId = @responsableId y TipoContacto = 'JURIDICA' -- nunca
 * la cartera completa de todos los Freelances.
 */
import { buscarEmpresasPorResponsable, existeEmpresaAccesible } from "../empresaBusqueda.repository";

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
      UniqueIdentifier: "UniqueIdentifier",
    },
  };
});

describe("empresaBusqueda.repository -> buscarEmpresasPorResponsable", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [{ Id: 5, RazonSocial: "Acme SAC" }];
  });

  test("filtra SIEMPRE por ResponsableId y TipoContacto = JURIDICA", async () => {
    await buscarEmpresasPorResponsable("resp-1", "acme");

    expect(queryText).toContain("ResponsableId = @responsableId");
    expect(queryText).toContain("TipoContacto = 'JURIDICA'");
    expect(queryText).toContain("EstadoContacto = 'ACTIVO'");

    const responsableInput = inputCalls.find(([name]) => name === "responsableId");
    expect(responsableInput?.[2]).toBe("resp-1");
  });

  test("un intento de inyección SQL en 'search' viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "acme'; DROP TABLE dbo.Contactos;--";

    await buscarEmpresasPorResponsable("resp-1", payloadMalicioso);

    expect(queryText).toContain("@search");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    // El valor sigue viajando ÚNICAMENTE como parámetro (con comodines
    // LIKE escapados alrededor), nunca concatenado en el texto de la query.
    const searchInput = inputCalls.find(([name]) => name === "search");
    expect(searchInput?.[2]).toContain(payloadMalicioso);
  });

  test("mapea el resultado a {contactoId, razonSocial}", async () => {
    const res = await buscarEmpresasPorResponsable("resp-1", "acme");
    expect(res).toEqual([{ contactoId: "5", razonSocial: "Acme SAC" }]);
  });
});

describe("empresaBusqueda.repository -> existeEmpresaAccesible", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [];
  });

  test("filtra por Id, ResponsableId, TipoContacto=JURIDICA y EstadoContacto=ACTIVO", async () => {
    nextRecordset = [{}];

    const res = await existeEmpresaAccesible(5, "resp-1");

    expect(queryText).toContain("Id = @contactoId");
    expect(queryText).toContain("ResponsableId = @responsableId");
    expect(queryText).toContain("TipoContacto = 'JURIDICA'");
    expect(res).toBe(true);
  });

  test("devuelve false cuando no hay ninguna fila coincidente", async () => {
    nextRecordset = [];
    const res = await existeEmpresaAccesible(999, "resp-1");
    expect(res).toBe(false);
  });
});
