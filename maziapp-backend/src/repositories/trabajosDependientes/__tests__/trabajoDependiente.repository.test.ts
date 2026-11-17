/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- protección contra SQL injection (mismo criterio que
 * direccion.repository.test.ts): sin base de datos real disponible en
 * este entorno de pruebas, se verifica a nivel de código que (a) el
 * texto de la query enviada a `mssql` es un literal estático
 * parametrizado, y (b) todo valor de usuario (contactoId, cargo,
 * empresaNombreLibre, etc.) llega ÚNICAMENTE mediante `.input(...)`,
 * nunca concatenado en el texto de la query. También verifica el
 * scoping por ContactoId + Activo = 1 en update/desactivar, y que
 * FechaModificacion se actualiza tanto en PATCH como en el soft
 * delete.
 */
import {
  saveTrabajoDependiente,
  updateTrabajoDependiente,
  desactivarTrabajoDependiente,
  findTrabajosByContacto,
} from "../trabajoDependiente.repository";

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
      Date: "Date",
      UniqueIdentifier: "UniqueIdentifier",
    },
  };
});

describe("trabajoDependiente.repository -> saveTrabajoDependiente (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [{ Id: 1 }];
  });

  test("un Cargo con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "Gerente'; DROP TABLE dbo.ContactoTrabajoDependiente;--";

    await saveTrabajoDependiente({
      contactoId: 20,
      empresaContactoId: null,
      empresaNombreLibre: "Empresa Libre S.A.",
      cargo: payloadMalicioso,
      desde: "2020-01-01",
      hasta: null,
      creadoNombre: "Test",
      creadoId: "user-1",
    });

    expect(queryText).toContain("@cargo");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const cargoInput = inputCalls.find(([name]) => name === "cargo");
    expect(cargoInput).toBeDefined();
    expect(cargoInput?.[2]).toBe(payloadMalicioso);
  });

  test("contactoId viaja como parámetro numérico, nunca concatenado, y Activo se fija a 1 en el INSERT", async () => {
    await saveTrabajoDependiente({
      contactoId: 20,
      empresaContactoId: null,
      empresaNombreLibre: "Empresa Libre S.A.",
      cargo: "Analista",
      desde: "2020-01-01",
      hasta: null,
      creadoNombre: "Test",
      creadoId: "user-1",
    });

    expect(queryText).toContain("@contactoId");

    const contactoIdInput = inputCalls.find(([name]) => name === "contactoId");
    expect(contactoIdInput?.[2]).toBe(20);

    expect(queryText).toMatch(/VALUES[\s\S]*1,\s*SYSUTCDATETIME\(\)/);
  });
});

describe("trabajoDependiente.repository -> updateTrabajoDependiente / desactivarTrabajoDependiente", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("updateTrabajoDependiente escopa por Id + ContactoId + Activo = 1 (nunca solo por Id), y actualiza FechaModificacion", async () => {
    nextRecordset = [{ Id: 1 }];

    const res = await updateTrabajoDependiente(1, 20, {
      empresaContactoId: null,
      empresaNombreLibre: "Empresa Libre S.A.",
      cargo: "Analista Senior",
      desde: "2020-01-01",
      hasta: null,
    });

    expect(queryText).toContain("Id = @id");
    expect(queryText).toContain("ContactoId = @contactoId");
    expect(queryText).toContain("Activo = 1");
    expect(queryText).toContain("FechaModificacion = SYSUTCDATETIME()");
    expect(res).toBe(true);
  });

  test("updateTrabajoDependiente devuelve false cuando la fila no es de ese contacto o ya está desactivada (recordset vacío)", async () => {
    nextRecordset = [];

    const res = await updateTrabajoDependiente(1, 999, {
      empresaContactoId: null,
      empresaNombreLibre: "Empresa Libre S.A.",
      cargo: "Analista",
      desde: "2020-01-01",
      hasta: null,
    });

    expect(res).toBe(false);
  });

  test("desactivarTrabajoDependiente hace UPDATE ... SET Activo = 0, FechaModificacion = SYSUTCDATETIME() (nunca DELETE físico), escopado por ContactoId", async () => {
    nextRecordset = [{ Id: 1 }];

    const res = await desactivarTrabajoDependiente(1, 20);

    expect(queryText).toMatch(/UPDATE dbo\.ContactoTrabajoDependiente/i);
    expect(queryText).not.toMatch(/DELETE FROM/i);
    expect(queryText).toContain("Activo = 0");
    expect(queryText).toContain("FechaModificacion = SYSUTCDATETIME()");
    expect(queryText).toContain("ContactoId = @contactoId");
    expect(res).toBe(true);
  });

  test("desactivarTrabajoDependiente devuelve false cuando la fila ya estaba inactiva", async () => {
    nextRecordset = [];

    const res = await desactivarTrabajoDependiente(1, 20);

    expect(res).toBe(false);
  });
});

describe("trabajoDependiente.repository -> findTrabajosByContacto", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [
      {
        Id: 1,
        ContactoId: 20,
        EmpresaContactoId: 10,
        EmpresaNombreLibre: null,
        EmpresaRazonSocial: "Empresa S.A.",
        Cargo: "Analista",
        Desde: new Date("2020-01-01"),
        Hasta: null,
        Activo: true,
        CreadoFecha: new Date(),
        CreadoNombre: "Test",
        CreadoId: "user-1",
        FechaModificacion: null,
      },
    ];
  });

  test("contactoId viaja como parámetro, la query hace LEFT JOIN a dbo.Contactos y filtra Activo = 1", async () => {
    const res = await findTrabajosByContacto(20);

    expect(queryText).toContain("@contactoId");
    expect(queryText).toMatch(/LEFT JOIN dbo\.Contactos/i);
    expect(queryText).toContain("td.Activo = 1");

    expect(res[0]).toMatchObject({
      id: "1",
      contactoId: "20",
      empresa: { tipo: "CONTACTO", contactoId: "10", nombre: "Empresa S.A." },
      cargo: "Analista",
    });
  });
});
