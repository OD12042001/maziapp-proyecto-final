/**
 * Fase Representantes -- protección contra SQL injection (mismo
 * criterio que contacto.repository.test.ts, sección 18): sin base de
 * datos real disponible en este entorno de pruebas, se verifica a
 * nivel de código que (a) el texto de la query enviada a `mssql` es un
 * literal estático parametrizado, y (b) todo valor de usuario llega
 * ÚNICAMENTE mediante `.input(...)`, nunca concatenado en el texto de
 * la query.
 */
import {
  saveRepresentante,
  saveRelacion,
  findRelacion,
  desactivarRelacion,
  updateRepresentante,
  updateCargoRelacion,
  findContactoRepresentantePorId,
} from "../representante.repository";

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
      UniqueIdentifier: "UniqueIdentifier",
      Int: "Int",
      Bit: "Bit",
    },
  };
});

describe("representante.repository -> saveRepresentante (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [
      {
        RepresentanteId: 1,
        TipoDocumento: "DNI",
        NumeroDocumento: "12345678",
        Nombres: "Juan",
        Apellidos: "Pérez",
        Celular: null,
        Correo: null,
      },
    ];
  });

  test("un numeroDocumento con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "1'; DROP TABLE dbo.Representantes;--";

    await saveRepresentante({
      tipoDocumento: "DNI",
      numeroDocumento: payloadMalicioso,
      nombres: "Juan",
      apellidos: "Pérez",
      celular: null,
      correo: null,
      creadoNombre: "Test",
      creadoCorreo: "test@example.com",
      creadoId: "creador-1",
    });

    expect(queryText).toContain("@numeroDocumento");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const numeroDocumentoInput = inputCalls.find(([name]) => name === "numeroDocumento");
    expect(numeroDocumentoInput).toBeDefined();
    expect(numeroDocumentoInput?.[2]).toBe(payloadMalicioso);
  });
});

describe("representante.repository -> saveRelacion (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [{ ContactoRepresentanteId: 5 }];
  });

  test("un Cargo con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const cargoMalicioso = "Gerente'; DROP TABLE dbo.Contactos;--";

    await saveRelacion({
      contactoId: 1,
      representanteId: 1,
      cargo: cargoMalicioso,
      creadoId: "creador-1",
    });

    expect(queryText).toContain("@cargo");
    expect(queryText).not.toContain(cargoMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const cargoInput = inputCalls.find(([name]) => name === "cargo");
    expect(cargoInput).toBeDefined();
    expect(cargoInput?.[2]).toBe(cargoMalicioso);
  });
});

describe("representante.repository -> findRelacion / desactivarRelacion", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("findRelacion pasa contactoId y representanteId como parámetros, nunca concatenados", async () => {
    nextRecordset = [{ ContactoRepresentanteId: 7, Activo: true }];

    const res = await findRelacion(1, 2);

    expect(queryText).toContain("@contactoId");
    expect(queryText).toContain("@representanteId");
    expect(res).toEqual({ contactoRepresentanteId: 7, activo: true });
  });

  test("findRelacion devuelve null cuando no existe ninguna relación previa", async () => {
    nextRecordset = [];

    const res = await findRelacion(1, 999);

    expect(res).toBeNull();
  });

  test("desactivarRelacion solo afecta filas activas (WHERE ... AND Activo = 1 en la query)", async () => {
    nextRecordset = [{ ContactoRepresentanteId: 7 }];

    const res = await desactivarRelacion(7, "actor-1");

    expect(queryText).toContain("Activo = 1");
    expect(queryText).toContain("Activo = 0");
    expect(res).toBe(true);
  });

  test("desactivarRelacion devuelve false cuando la fila ya estaba inactiva (recordset vacío)", async () => {
    nextRecordset = [];

    const res = await desactivarRelacion(7, "actor-1");

    expect(res).toBe(false);
  });
});

/**
 * Fase Representantes (Edición) -- updateRepresentante /
 * updateCargoRelacion / findContactoRepresentantePorId. Mismo criterio
 * que el resto de este archivo: parametrización SQL y protección
 * contra injection, sin base de datos real.
 */
describe("representante.repository -> updateRepresentante (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
    nextRecordset = [];
  });

  test("actualiza dbo.Representantes por RepresentanteId, nunca por documento/otra fila", async () => {
    await updateRepresentante(5, {
      nombres: "Juan",
      apellidos: "Pérez",
      celular: "999888777",
      correo: "juan@example.com",
      actualizadoNombre: "Actor Test",
      actualizadoCorreo: "actor@example.com",
      actualizadoId: "actor-1",
    });

    expect(queryText).toContain("UPDATE dbo.Representantes");
    expect(queryText).toContain("WHERE RepresentanteId = @representanteId");
    // Nunca toca TipoDocumento/NumeroDocumento ni ninguna fila de
    // dbo.ContactoRepresentante (ver representante.repository.ts).
    expect(queryText).not.toContain("TipoDocumento");
    expect(queryText).not.toContain("NumeroDocumento");
    expect(queryText).not.toContain("dbo.ContactoRepresentante");

    const representanteIdInput = inputCalls.find(([name]) => name === "representanteId");
    expect(representanteIdInput?.[2]).toBe(5);
  });

  test("un nombre con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const nombreMalicioso = "Juan'; DROP TABLE dbo.Representantes;--";

    await updateRepresentante(5, {
      nombres: nombreMalicioso,
      apellidos: "Pérez",
      celular: null,
      correo: null,
      actualizadoNombre: "Actor",
      actualizadoCorreo: "actor@example.com",
      actualizadoId: "actor-1",
    });

    expect(queryText).toContain("@nombres");
    expect(queryText).not.toContain(nombreMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const nombresInput = inputCalls.find(([name]) => name === "nombres");
    expect(nombresInput?.[2]).toBe(nombreMalicioso);
  });
});

describe("representante.repository -> updateCargoRelacion (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("actualiza SOLO la relación indicada (WHERE ... AND Activo = 1), nunca dbo.Representantes", async () => {
    nextRecordset = [{ ContactoRepresentanteId: 900 }];

    const res = await updateCargoRelacion(900, "Gerente de Finanzas", "actor-1");

    expect(queryText).toContain("UPDATE dbo.ContactoRepresentante");
    expect(queryText).toContain("WHERE ContactoRepresentanteId = @contactoRepresentanteId AND Activo = 1");
    expect(queryText).not.toContain("UPDATE dbo.Representantes");
    expect(res).toBe(true);
  });

  test("un cargo con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    nextRecordset = [{ ContactoRepresentanteId: 900 }];
    const cargoMalicioso = "Gerente'; DROP TABLE dbo.ContactoRepresentante;--";

    await updateCargoRelacion(900, cargoMalicioso, "actor-1");

    expect(queryText).toContain("@cargo");
    expect(queryText).not.toContain(cargoMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const cargoInput = inputCalls.find(([name]) => name === "cargo");
    expect(cargoInput?.[2]).toBe(cargoMalicioso);
  });

  test("devuelve false cuando la relación ya no está activa (recordset vacío -- carrera con una desactivación concurrente)", async () => {
    nextRecordset = [];

    const res = await updateCargoRelacion(900, "Gerente", "actor-1");

    expect(res).toBe(false);
  });
});

describe("representante.repository -> findContactoRepresentantePorId", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("pasa contactoRepresentanteId como parámetro, nunca concatenado, y hace JOIN con dbo.Representantes", async () => {
    nextRecordset = [
      {
        ContactoRepresentanteId: 900,
        ContactoId: 10,
        RepresentanteId: 5,
        Cargo: "Gerente de Finanzas",
        Activo: true,
        TipoDocumento: "DNI",
        NumeroDocumento: "12345678",
        Nombres: "Juan",
        Apellidos: "Pérez",
        Celular: "999888777",
        Correo: "juan@example.com",
      },
    ];

    const res = await findContactoRepresentantePorId(900);

    expect(queryText).toContain("@contactoRepresentanteId");
    expect(queryText).toContain("INNER JOIN dbo.Representantes");
    expect(res).toEqual({
      contactoRepresentanteId: "900",
      representanteId: "5",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Pérez",
      cargo: "Gerente de Finanzas",
      celular: "999888777",
      correo: "juan@example.com",
    });
  });

  test("devuelve null cuando la relación no existe", async () => {
    nextRecordset = [];

    const res = await findContactoRepresentantePorId(999);

    expect(res).toBeNull();
  });
});
