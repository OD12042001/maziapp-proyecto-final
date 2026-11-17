/**
 * Fase Actividad -- contactoActividad.repository.ts
 *
 * Cubre: parametrización (nunca concatenación) en las lecturas, el
 * mapeo `empresa: {tipo, contactoId, nombre}` que oculta
 * EmpresaContactoId/EmpresaNombreLibre del Frontend (función legada
 * `findTrabajosByContacto`, conservada temporalmente -- ver nota en el
 * propio archivo fuente), y sobre todo la PRIMERA transacción SQL
 * explícita del proyecto (`guardarActividadConTrabajos`): debe hacer
 * COMMIT solo si el upsert de Actividad se insertó/actualizó sin
 * error, y ROLLBACK -- sin persistir nada -- si falla.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): `guardarActividadConTrabajos` YA NO recibe
 * `trabajosNuevos` ni inserta en dbo.ContactoTrabajoDependiente -- esa
 * responsabilidad es exclusiva de trabajoDependiente.repository.ts
 * (Etapa 2, ver su propia suite de tests). Esta suite ya no cubre
 * inserción de trabajos; en su lugar verifica explícitamente que
 * ninguna query de esta función toque
 * dbo.ContactoTrabajoDependiente.
 *
 * Sin base de datos real disponible en este entorno de pruebas (mismo
 * criterio que contacto.repository.test.ts/direccion.repository.test.ts)
 * -- se simula `mssql` con un mock local que registra cada
 * query/input y permite forzar un error en cualquier paso, mismo
 * patrón (variables cerradas por el factory de jest.mock) que esos
 * archivos.
 */
import {
  findActividadByContacto,
  findTrabajosByContacto,
  guardarActividadConTrabajos,
} from "../contactoActividad.repository";

const calls: Array<{ text: string; inputs: Record<string, unknown> }> = [];
const responseQueue: unknown[] = [];
const transactionEvents: string[] = [];

jest.mock("../../../config/sql", () => {
  function makeRequest() {
    const req: any = { inputs: {} };
    req.input = (name: string, _type: unknown, value: unknown) => {
      req.inputs[name] = value;
      return req;
    };
    req.query = async (text: string) => {
      calls.push({ text, inputs: { ...req.inputs } });
      const next = responseQueue.shift();
      if (next instanceof Error) throw next;
      return next ?? { recordset: [] };
    };
    return req;
  }

  class FakeTransaction {
    async begin() {
      transactionEvents.push("begin");
    }
    async commit() {
      transactionEvents.push("commit");
    }
    async rollback() {
      transactionEvents.push("rollback");
    }
  }

  function FakeRequest() {
    return makeRequest();
  }

  const pool = { request: () => makeRequest() };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      NVarChar: (n: number) => `NVarChar(${n})`,
      Date: "Date",
      UniqueIdentifier: "UniqueIdentifier",
      Transaction: FakeTransaction,
      Request: FakeRequest,
    },
  };
});

function reset() {
  calls.length = 0;
  responseQueue.length = 0;
  transactionEvents.length = 0;
}

const actor = { id: "user-1", nombre: "Test", correo: "test@example.com" };

describe("contactoActividad.repository -> lecturas", () => {
  beforeEach(() => {
    reset();
  });

  test("findActividadByContacto: contactoId viaja parametrizado, nunca concatenado", async () => {
    responseQueue.push({ recordset: [] });

    const res = await findActividadByContacto(10);

    expect(calls[0].text).toContain("@contactoId");
    expect(calls[0].inputs.contactoId).toBe(10);
    expect(res).toBeNull();
  });

  test("findTrabajosByContacto: mapea EmpresaContactoId -> empresa.tipo CONTACTO, con nombre resuelto por JOIN", async () => {
    responseQueue.push({
      recordset: [
        {
          Id: 1,
          ContactoId: 10,
          EmpresaContactoId: 5,
          EmpresaNombreLibre: null,
          EmpresaRazonSocial: "Acme SAC",
          Cargo: "Analista",
          Desde: new Date("2020-01-01T00:00:00Z"),
          Hasta: null,
          CreadoFecha: new Date("2020-01-02T00:00:00Z"),
          CreadoNombre: "Test",
          CreadoId: "user-1",
        },
      ],
    });

    const [trabajo] = await findTrabajosByContacto(10);

    expect(trabajo.empresa).toEqual({ tipo: "CONTACTO", contactoId: "5", nombre: "Acme SAC" });
    expect(trabajo.desde).toBe("2020-01-01");
    expect(trabajo.hasta).toBeNull();
  });

  test("findTrabajosByContacto: mapea EmpresaNombreLibre -> empresa.tipo LIBRE, sin contactoId", async () => {
    responseQueue.push({
      recordset: [
        {
          Id: 2,
          ContactoId: 10,
          EmpresaContactoId: null,
          EmpresaNombreLibre: "Empresa Manual SAC",
          EmpresaRazonSocial: null,
          Cargo: "Vendedor",
          Desde: new Date("2019-01-01T00:00:00Z"),
          Hasta: new Date("2020-01-01T00:00:00Z"),
          CreadoFecha: new Date("2019-01-02T00:00:00Z"),
          CreadoNombre: "Test",
          CreadoId: "user-1",
        },
      ],
    });

    const [trabajo] = await findTrabajosByContacto(10);

    expect(trabajo.empresa).toEqual({ tipo: "LIBRE", contactoId: null, nombre: "Empresa Manual SAC" });
  });
});

describe("contactoActividad.repository -> guardarActividadConTrabajos (transacción)", () => {
  beforeEach(() => {
    reset();
  });

  test("primer guardado (sin fila previa): UPDATE no afecta filas -> hace INSERT de ContactoActividad, luego COMMIT", async () => {
    responseQueue.push({ recordset: [] }); // UPDATE (0 filas)
    responseQueue.push({ recordset: [] }); // INSERT ContactoActividad
    responseQueue.push({
      recordset: [
        {
          ContactoId: 10,
          GradoInstruccion: "TECNICO",
          ProfesionOcupacion: "Contador",
          CiiuId: null,
          CreadoFecha: new Date(),
          CreadoNombre: null,
          CreadoCorreo: null,
          CreadoId: null,
          ActualizadoFecha: null,
          ActualizadoNombre: null,
          ActualizadoCorreo: null,
          ActualizadoId: null,
        },
      ],
    }); // findActividadByContacto (post-commit)

    const res = await guardarActividadConTrabajos(
      10,
      { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
      null,
      actor,
    );

    const texts = calls.map((c) => c.text);
    expect(texts[0]).toMatch(/UPDATE dbo\.ContactoActividad/);
    expect(texts[1]).toMatch(/INSERT INTO dbo\.ContactoActividad/);

    expect(transactionEvents).toEqual(["begin", "commit"]);
    expect(res.actividad.gradoInstruccion).toBe("TECNICO");
    expect((res as any).trabajos).toBeUndefined();
  });

  test("segundo guardado (ya existe fila): UPDATE afecta 1 fila -> NO ejecuta INSERT de ContactoActividad", async () => {
    responseQueue.push({ recordset: [{ ContactoId: 10 }] }); // UPDATE (1 fila afectada)
    responseQueue.push({
      recordset: [
        {
          ContactoId: 10,
          GradoInstruccion: "SUPERIOR",
          ProfesionOcupacion: "Ingeniero",
          CiiuId: null,
          CreadoFecha: new Date(),
          CreadoNombre: null,
          CreadoCorreo: null,
          CreadoId: null,
          ActualizadoFecha: new Date(),
          ActualizadoNombre: null,
          ActualizadoCorreo: null,
          ActualizadoId: null,
        },
      ],
    }); // findActividadByContacto

    await guardarActividadConTrabajos(
      10,
      { gradoInstruccion: "SUPERIOR", profesionOcupacion: "Ingeniero" },
      null,
      actor,
    );

    const texts = calls.map((c) => c.text);
    expect(texts.some((t) => /INSERT INTO dbo\.ContactoActividad/.test(t))).toBe(false);
    expect(transactionEvents).toEqual(["begin", "commit"]);
  });

  test("si el guardado de Actividad falla, hace ROLLBACK y NO hace commit (sin guardado parcial)", async () => {
    responseQueue.push({ recordset: [] }); // UPDATE (0 filas)
    responseQueue.push(new Error("Violation of PRIMARY KEY constraint")); // INSERT ContactoActividad falla

    await expect(
      guardarActividadConTrabajos(
        10,
        { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
        null,
        actor,
      ),
    ).rejects.toThrow("Violation of PRIMARY KEY constraint");

    expect(transactionEvents).toEqual(["begin", "rollback"]);
    expect(transactionEvents).not.toContain("commit");
  });

  test("rama JURIDICA: guarda ciiuId, gradoInstruccion/profesionOcupacion viajan NULL", async () => {
    responseQueue.push({ recordset: [] }); // UPDATE (0 filas)
    responseQueue.push({ recordset: [] }); // INSERT ContactoActividad
    responseQueue.push({
      recordset: [
        {
          ContactoId: 20,
          GradoInstruccion: null,
          ProfesionOcupacion: null,
          CiiuId: 12,
          CreadoFecha: new Date(),
          CreadoNombre: null,
          CreadoCorreo: null,
          CreadoId: null,
          ActualizadoFecha: null,
          ActualizadoNombre: null,
          ActualizadoCorreo: null,
          ActualizadoId: null,
        },
      ],
    }); // findActividadByContacto

    const res = await guardarActividadConTrabajos(20, null, { ciiuId: 12 }, actor);

    const insertCall = calls.find((c) => /INSERT INTO dbo\.ContactoActividad/.test(c.text));
    expect(insertCall?.inputs.gradoInstruccion).toBeNull();
    expect(insertCall?.inputs.profesionOcupacion).toBeNull();
    expect(insertCall?.inputs.ciiuId).toBe(12);
    expect(res.actividad.ciiuId).toBe(12);
  });

  // 🔐 Requisito explícito de la Etapa 3: Actividad ya NO debe insertar
  // registros en dbo.ContactoTrabajoDependiente bajo ninguna
  // circunstancia -- se verifica sobre TODAS las queries ejecutadas en
  // los cuatro escenarios anteriores (upsert NATURAL con/sin fila
  // previa, JURIDICA, y el camino de error), nunca solo sobre una.
  test("guardarActividadConTrabajos nunca ejecuta ninguna query sobre dbo.ContactoTrabajoDependiente", async () => {
    responseQueue.push({ recordset: [] }); // UPDATE (0 filas)
    responseQueue.push({ recordset: [] }); // INSERT ContactoActividad
    responseQueue.push({
      recordset: [
        {
          ContactoId: 10,
          GradoInstruccion: "TECNICO",
          ProfesionOcupacion: "Contador",
          CiiuId: null,
          CreadoFecha: new Date(),
          CreadoNombre: null,
          CreadoCorreo: null,
          CreadoId: null,
          ActualizadoFecha: null,
          ActualizadoNombre: null,
          ActualizadoCorreo: null,
          ActualizadoId: null,
        },
      ],
    }); // findActividadByContacto

    await guardarActividadConTrabajos(
      10,
      { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
      null,
      actor,
    );

    expect(calls.every((c) => !/ContactoTrabajoDependiente/i.test(c.text))).toBe(true);
  });
});
