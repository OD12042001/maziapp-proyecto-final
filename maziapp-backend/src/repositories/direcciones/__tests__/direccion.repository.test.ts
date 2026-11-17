/**
 * Fase Direcciones -- protección contra SQL injection (mismo criterio
 * que representante.repository.test.ts): sin base de datos real
 * disponible en este entorno de pruebas, se verifica a nivel de código
 * que (a) el texto de la query enviada a `mssql` es un literal
 * estático parametrizado, y (b) todo valor de usuario (idContacto,
 * idDistrito, calle, numero, departamentoInterior) llega ÚNICAMENTE
 * mediante `.input(...)`, nunca concatenado en el texto de la query.
 */
import {
  saveDireccion,
  updateDireccion,
  desactivarDireccion,
  findDireccionesByContacto,
} from "../direccion.repository";

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

describe("direccion.repository -> saveDireccion (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [{ IdDireccion: 1 }];
  });

  test("una Calle con sintaxis SQL maliciosa viaja como parámetro, nunca concatenada", async () => {
    const payloadMalicioso = "Av. Test'; DROP TABLE dbo.Direcciones;--";

    await saveDireccion({
      idContacto: 10,
      idDistrito: 1501,
      calle: payloadMalicioso,
      numero: "123",
      departamentoInterior: null,
    });

    expect(queryText).toContain("@calle");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const calleInput = inputCalls.find(([name]) => name === "calle");
    expect(calleInput).toBeDefined();
    expect(calleInput?.[2]).toBe(payloadMalicioso);
  });

  test("idContacto e idDistrito viajan como parámetros numéricos, nunca concatenados", async () => {
    await saveDireccion({
      idContacto: 10,
      idDistrito: 1501,
      calle: "Av. Test",
      numero: "123",
      departamentoInterior: null,
    });

    expect(queryText).toContain("@idContacto");
    expect(queryText).toContain("@idDistrito");

    const idContactoInput = inputCalls.find(([name]) => name === "idContacto");
    const idDistritoInput = inputCalls.find(([name]) => name === "idDistrito");
    expect(idContactoInput?.[2]).toBe(10);
    expect(idDistritoInput?.[2]).toBe(1501);
  });
});

describe("direccion.repository -> updateDireccion / desactivarDireccion", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("updateDireccion escopa por IdDireccion + IdContacto + Activo = 1 (nunca solo por IdDireccion)", async () => {
    nextRecordset = [{ IdDireccion: 1 }];

    const res = await updateDireccion(1, 10, {
      idDistrito: 1501,
      calle: "Av. Test",
      numero: "123",
      departamentoInterior: null,
    });

    expect(queryText).toContain("IdDireccion = @idDireccion");
    expect(queryText).toContain("IdContacto = @idContacto");
    expect(queryText).toContain("Activo = 1");
    expect(res).toBe(true);
  });

  test("updateDireccion devuelve false cuando la fila no es de ese contacto o ya está desactivada (recordset vacío)", async () => {
    nextRecordset = [];

    const res = await updateDireccion(1, 999, {
      idDistrito: 1501,
      calle: "Av. Test",
      numero: "123",
      departamentoInterior: null,
    });

    expect(res).toBe(false);
  });

  test("desactivarDireccion hace UPDATE ... SET Activo = 0 (nunca DELETE físico), escopado por IdContacto", async () => {
    nextRecordset = [{ IdDireccion: 1 }];

    const res = await desactivarDireccion(1, 10);

    expect(queryText).toMatch(/UPDATE dbo\.Direcciones/i);
    expect(queryText).not.toMatch(/DELETE FROM/i);
    expect(queryText).toContain("Activo = 0");
    expect(queryText).toContain("IdContacto = @idContacto");
    expect(res).toBe(true);
  });

  test("desactivarDireccion devuelve false cuando la fila ya estaba inactiva", async () => {
    nextRecordset = [];

    const res = await desactivarDireccion(1, 10);

    expect(res).toBe(false);
  });
});

describe("direccion.repository -> findDireccionesByContacto", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [
      {
        IdDireccion: 1,
        IdContacto: 10,
        IdDistrito: 1501,
        Calle: "Av. Test",
        Numero: "123",
        DepartamentoInterior: null,
        Activo: true,
        FechaCreacion: new Date(),
        FechaModificacion: null,
        Distrito: "MIRAFLORES",
        Provincia: "LIMA",
        Departamento: "LIMA",
      },
    ];
  });

  test("idContacto viaja como parámetro, la query hace JOIN a Distritos/Provincias/Departamentos y filtra Activo = 1", async () => {
    const res = await findDireccionesByContacto(10);

    expect(queryText).toContain("@idContacto");
    expect(queryText).toMatch(/JOIN dbo\.Distritos/i);
    expect(queryText).toMatch(/JOIN dbo\.Provincias/i);
    expect(queryText).toMatch(/JOIN dbo\.Departamentos/i);
    expect(queryText).toContain("dir.Activo = 1");

    expect(res[0]).toMatchObject({
      idDireccion: 1,
      distrito: "MIRAFLORES",
      provincia: "LIMA",
      departamento: "LIMA",
    });
  });
});
