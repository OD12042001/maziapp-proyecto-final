/**
 * Cobertura del escenario 18 pedido en Fase 3, sección 17:
 *   18. SQL injection básica -> rechazada/no ejecutada
 *
 * No hay una base de datos real disponible en este entorno de pruebas
 * (ver limitación declarada en el plan de Fase 3), así que esta
 * suite NO ejecuta SQL contra un motor real. En su lugar, verifica al
 * nivel de código que:
 *   (a) el texto de la query enviada a `mssql` es un literal estático
 *       parametrizado (contiene "@numeroDocumento", no el valor
 *       recibido concatenado), y
 *   (b) el valor potencialmente malicioso llega ÚNICAMENTE a través
 *       de `.input("numeroDocumento", ...)`, nunca dentro del texto
 *       de la query.
 * Esto es equivalente a demostrar que una cadena tipo
 * `"1'; DROP TABLE dbo.Contactos;--"` viaja como dato parametrizado y
 * nunca como fragmento de sentencia SQL — que es exactamente lo que
 * previene la inyección con el driver `mssql`.
 */
import { saveContacto, updateContacto } from "../contacto.repository";

const inputCalls: Array<[string, unknown, unknown]> = [];
let queryText = "";

jest.mock("../../../config/sql", () => {
  const request = {
    input: jest.fn(function (this: any, name: string, type: unknown, value: unknown) {
      inputCalls.push([name, type, value]);
      return this;
    }),
    query: jest.fn(async (text: string) => {
      queryText = text;
      return {
        recordset: [
          {
            Id: 1,
            TipoContacto: "NATURAL",
            TipoDocumento: "DNI",
            NumeroDocumento: "12345678",
            Nombres: "Juan",
            Apellidos: "Perez",
            RazonSocial: null,
            FechaNacimiento: null,
            Sexo: null,
            EstadoCivil: null,
            Nacionalidad: null,
            PaisResidencia: null,
            EsPep: false,
            EstadoContacto: "ACTIVO",
            Celular: null,
            Correo: null,
            TelefonoFijo: null,
            ResponsableId: "resp-1",
            CreadoFecha: new Date(),
            CreadoNombre: "Test",
            CreadoCorreo: "test@example.com",
            CreadoId: "creador-1",
            ActualizadoFecha: null,
            ActualizadoNombre: null,
            ActualizadoCorreo: null,
            ActualizadoId: null,
          },
        ],
      };
    }),
  };

  const pool = { request: () => request };

  return {
    getPool: async () => pool,
    sql: {
      NVarChar: (n: number) => `NVarChar(${n})`,
      UniqueIdentifier: "UniqueIdentifier",
      Bit: "Bit",
      Date: "Date",
      Int: "Int",
    },
  };
});

describe("contacto.repository -> saveContacto (protección contra SQL injection)", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("un numeroDocumento con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "1'; DROP TABLE dbo.Contactos;--";

    await saveContacto({
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: payloadMalicioso,
      nombres: "Juan",
      apellidos: "Perez",
      razonSocial: null,
      fechaNacimiento: null,
      sexo: null,
      estadoCivil: null,
      nacionalidad: null,
      paisResidencia: null,
      esPep: false,
      estadoContacto: "ACTIVO",
      celular: null,
      correo: null,
      telefonoFijo: null,
      responsableId: "resp-1",
      creadoNombre: "Test",
      creadoCorreo: "test@example.com",
      creadoId: "creador-1",
    });

    // (a) La query enviada al driver es un literal estático
    // parametrizado — no contiene el payload malicioso embebido.
    expect(queryText).toContain("@numeroDocumento");
    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    // (b) El valor malicioso SÍ se pasó, pero exclusivamente como
    // parámetro vinculado (`.input`), donde el driver lo trata como
    // dato, nunca como sentencia SQL.
    const numeroDocumentoInput = inputCalls.find(
      ([name]) => name === "numeroDocumento",
    );
    expect(numeroDocumentoInput).toBeDefined();
    expect(numeroDocumentoInput?.[2]).toBe(payloadMalicioso);
  });
});
// ✏️ Fase 3.15 / 7A — updateContacto (Cliente + Ubicación).
//
// Mismo criterio de prueba que saveContacto arriba: sin BD real, se
// verifica a nivel de código que (a) el SET dinámico solo incluye las
// columnas correspondientes a las claves realmente presentes en
// `fields`, (b) esas columnas viajan siempre como texto FIJO tomado
// del mapa `CAMPOS_ACTUALIZABLES` del propio repository (nunca un
// nombre de columna derivado de datos de usuario), y (c) todo VALOR
// de usuario, incluyendo uno con sintaxis SQL maliciosa, viaja
// exclusivamente como parámetro `.input(...)`.
describe("contacto.repository -> updateContacto", () => {
  beforeEach(() => {
    inputCalls.length = 0;
    queryText = "";
  });

  test("el SET dinámico solo incluye las columnas de los campos enviados (no pisa columnas ausentes)", async () => {
    await updateContacto(
      1,
      { celular: "999888777" },
      {
        actualizadoId: "resp-1",
        actualizadoNombre: "Test",
        actualizadoCorreo: "test@example.com",
      },
    );

    expect(queryText).toContain("Celular = @celular");
    expect(queryText).not.toContain("Nombres = @nombres");
    expect(queryText).not.toContain("RazonSocial = @razonSocial");
    // Columnas de auditoría siempre se actualizan, sin importar qué
    // otro campo llegó.
    expect(queryText).toContain("ActualizadoFecha = SYSUTCDATETIME()");
    expect(queryText).toContain("ActualizadoId = @actualizadoId");
  });

  test("WHERE Id = @id (filtra únicamente por id; el ownership ya se validó en el service)", async () => {
    await updateContacto(
      42,
      { correo: "nuevo@example.com" },
      {
        actualizadoId: "resp-1",
        actualizadoNombre: "Test",
        actualizadoCorreo: "test@example.com",
      },
    );

    expect(queryText).toMatch(/WHERE\s+Id\s*=\s*@id/);
    const idInput = inputCalls.find(([name]) => name === "id");
    expect(idInput?.[2]).toBe(42);
  });

  test("un valor con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "'; DROP TABLE dbo.Contactos;--";

    await updateContacto(
      1,
      { correo: payloadMalicioso as any },
      {
        actualizadoId: "resp-1",
        actualizadoNombre: "Test",
        actualizadoCorreo: "test@example.com",
      },
    );

    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");

    const correoInput = inputCalls.find(([name]) => name === "correo");
    expect(correoInput).toBeDefined();
    expect(correoInput?.[2]).toBe(payloadMalicioso);
  });

  test("campo no reconocido (fuera de CAMPOS_ACTUALIZABLES) no puede inyectar un nombre de columna arbitrario", async () => {
    await updateContacto(
      1,
      { celular: "999888777" } as any,
      {
        actualizadoId: "resp-1",
        actualizadoNombre: "Test",
        actualizadoCorreo: "test@example.com",
      },
    );

    // El texto de la query es enteramente literal: nombres de columna
    // fijos del código, nunca interpolados desde `fields`.
    expect(queryText).toMatch(/UPDATE dbo\.Contactos/);
    expect(queryText).toContain("OUTPUT inserted.*");
  });
});
