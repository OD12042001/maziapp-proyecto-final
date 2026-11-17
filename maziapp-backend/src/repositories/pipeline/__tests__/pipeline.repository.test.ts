/**
 * pipeline.repository (S06).
 *
 * Sin base de datos real en la suite (mismo criterio declarado en el
 * repositorio de Contactos): se mockea `config/sql` y se verifica que
 * (a) todo valor de usuario viaja como parámetro `.input(...)` y nunca
 * concatenado en el texto SQL, (b) los filtros opcionales solo aparecen
 * cuando se envían, (c) la paginación usa OFFSET/FETCH parametrizado, y
 * (d) las escrituras que tocan más de una tabla corren en transacción.
 */
jest.mock("../../../config/sql", () => {
  const state: any = {
    inputCalls: [],
    queries: [],
    results: [] as any[],
    transaction: {
      begin: jest.fn(async () => undefined),
      commit: jest.fn(async () => undefined),
      rollback: jest.fn(async () => undefined),
    },
  };

  const makeRequest = () => ({
    input(this: any, name: string, type: unknown, value: unknown) {
      state.inputCalls.push([name, type, value]);
      return this;
    },
    async query(text: string) {
      state.queries.push(text);
      const recordset = state.results.length > 0 ? state.results.shift() : [];
      return { recordset, rowsAffected: [1] };
    },
  });

  state.transaction.request = makeRequest;
  state.requestFactory = makeRequest;

  const pool = {
    request: makeRequest,
    transaction: () => state.transaction,
  };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      BigInt: "BigInt",
      Bit: "Bit",
      UniqueIdentifier: "UniqueIdentifier",
      NVarChar: (n: number) => `NVarChar(${n})`,
      Char: (n: number) => `Char(${n})`,
      Decimal: () => "Decimal",
    },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findAllEtapas,
  findEtapasActivas,
  findMonedaActiva,
  findOportunidades,
  findHistorialByOportunidad,
  saveOportunidad,
  actualizarEtapa,
  marcarPerdida,
  existeKycValidado,
  existeCierreRegistrado,
} from "../pipeline.repository";

const state = (sqlConfig as any).__state as {
  inputCalls: Array<[string, unknown, unknown]>;
  queries: string[];
  results: any[];
  transaction: {
    begin: jest.Mock;
    commit: jest.Mock;
    rollback: jest.Mock;
    request: any;
  };
  requestFactory: any;
};

const GUID = "11111111-2222-3333-4444-555555555555";

function filaOportunidad(overrides: Record<string, unknown> = {}) {
  return {
    OportunidadId: 7,
    ContactoId: 20,
    ResponsableId: GUID.toUpperCase(),
    Estado: "ACTIVA",
    MontoEstimado: "200000.00",
    MonedaCodigo: "PEN",
    FechaCreacionUtc: new Date("2026-11-16T10:00:00Z"),
    FechaIngresoEtapaUtc: new Date("2026-11-16T10:00:00Z"),
    FechaResultadoUtc: null,
    MotivoPerdida: null,
    EtapaId: 1,
    EtapaCodigo: "PROSPECTO",
    EtapaNombre: "Prospecto",
    EtapaOrden: 1,
    EtapaPermiteCierre: false,
    EtapaEsFinal: false,
    EtapaActivo: true,
    NombreCompleto: "Inversiones Andinas S.A.C.",
    KycExpedienteId: null,
    KycEstado: null,
    CierreId: null,
    MontoCaptado: null,
    FechaCierreUtc: null,
    ComisionId: null,
    ComisionImporteTotal: null,
    ComisionEstado: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
  state.transaction.request = state.requestFactory;
  state.transaction.begin.mockClear();
  state.transaction.commit.mockClear();
  state.transaction.rollback.mockClear();
});

describe("pipeline.repository -> findOportunidades", () => {
  test("sin filtros opcionales no agrega WHERE y devuelve items+total", async () => {
    state.results.push([{ Total: 2 }], [filaOportunidad(), filaOportunidad({ OportunidadId: 8 })]);

    const res = await findOportunidades({ page: 1, pageSize: 20 });

    expect(res.total).toBe(2);
    expect(res.items).toHaveLength(2);
    expect(state.queries[0]).not.toMatch(/WHERE/);
    expect(state.queries[0]).toMatch(/COUNT\(\*\)/);
  });

  test("aplica el filtro de responsableId cuando llega (cartera ajena)", async () => {
    state.results.push([{ Total: 0 }], []);

    await findOportunidades({ responsableId: GUID, page: 1, pageSize: 20 });

    expect(state.queries[1]).toMatch(/ResponsableId\s*=\s*@responsableId/);
    const param = state.inputCalls.find(([name]) => name === "responsableId");
    expect(param?.[2]).toBe(GUID);
  });

  test("aplica estado, etapaCodigo y contactoId como parámetros", async () => {
    state.results.push([{ Total: 0 }], []);

    await findOportunidades({
      estado: "ACTIVA",
      etapaCodigo: "NEGOCIACION",
      contactoId: 20,
      page: 1,
      pageSize: 20,
    });

    expect(state.queries[1]).toMatch(/Estado\s*=\s*@estado/);
    expect(state.queries[1]).toMatch(/EtapaCodigo\s*=\s*@etapaCodigo/);
    expect(state.queries[1]).toMatch(/ContactoId\s*=\s*@contactoId/);
    expect(state.inputCalls.find(([n]) => n === "estado")?.[2]).toBe("ACTIVA");
    expect(state.inputCalls.find(([n]) => n === "etapaCodigo")?.[2]).toBe("NEGOCIACION");
    expect(state.inputCalls.find(([n]) => n === "contactoId")?.[2]).toBe(20);
  });

  test("pagina con OFFSET/FETCH parametrizado, nunca interpolado", async () => {
    state.results.push([{ Total: 100 }], []);

    await findOportunidades({ page: 3, pageSize: 10 });

    expect(state.queries[1]).toMatch(/OFFSET\s+@offset\s+ROWS/i);
    expect(state.queries[1]).toMatch(/FETCH\s+NEXT\s+@pageSize\s+ROWS/i);
    expect(state.inputCalls.find(([n]) => n === "offset")?.[2]).toBe(20);
    expect(state.inputCalls.find(([n]) => n === "pageSize")?.[2]).toBe(10);
  });

  test("un estado con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    state.results.push([{ Total: 0 }], []);
    const payload = "ACTIVA'; DROP TABLE dbo.Oportunidades;--";

    await findOportunidades({ estado: payload, page: 1, pageSize: 20 });

    expect(state.queries.join(" ")).not.toContain("DROP TABLE");
    expect(state.inputCalls.find(([n]) => n === "estado")?.[2]).toBe(payload);
  });
});

describe("pipeline.repository -> saveOportunidad", () => {
  test("inserta la oportunidad y su primer hito de historial en una transacción", async () => {
    state.results.push([{ OportunidadId: 7 }], [], [filaOportunidad()]);

    const res = await saveOportunidad(
      {
        contactoId: 20,
        responsableId: GUID,
        etapaId: 1,
        montoEstimado: 200000,
        monedaCodigo: "PEN",
        creadoId: GUID,
        creadoNombre: "Test",
      },
      { correlationId: "corr-1" },
    );

    expect(state.transaction.begin).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(state.transaction.rollback).not.toHaveBeenCalled();
    expect(state.queries[0]).toMatch(/INSERT INTO dbo\.Oportunidades/);
    expect(state.queries[1]).toMatch(/INSERT INTO dbo\.OportunidadEtapaHistorial/);
    // El primer hito no tiene etapa de origen.
    expect(state.queries[1]).toMatch(/EtapaOrigenId/);
    expect(state.inputCalls.find(([n]) => n === "etapaOrigenId")).toBeUndefined();
    expect(res.oportunidadId).toBe(7);
    expect(res.etapa.codigo).toBe("PROSPECTO");
  });

  test("si el segundo INSERT falla, hace rollback y no propaga una fila a medias", async () => {
    state.results.push([{ OportunidadId: 7 }]);

    const original = state.transaction.request;
    let calls = 0;
    state.transaction.request = () => {
      const request = original();
      return {
        input: request.input,
        async query(text: string) {
          calls++;
          if (calls === 2) throw new Error("fallo simulado");
          return request.query(text);
        },
      };
    };

    await expect(
      saveOportunidad(
        {
          contactoId: 20,
          responsableId: GUID,
          etapaId: 1,
          montoEstimado: null,
          monedaCodigo: null,
          creadoId: GUID,
          creadoNombre: "Test",
        },
        { correlationId: "corr-1" },
      ),
    ).rejects.toThrow("fallo simulado");

    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).not.toHaveBeenCalled();

    state.transaction.request = original;
  });

  test("los valores de usuario viajan como parámetros", async () => {
    state.results.push([{ OportunidadId: 7 }], [], [filaOportunidad()]);
    const nombreMalicioso = "Robert'); DROP TABLE dbo.Oportunidades;--";

    await saveOportunidad(
      {
        contactoId: 20,
        responsableId: GUID,
        etapaId: 1,
        montoEstimado: null,
        monedaCodigo: null,
        creadoId: GUID,
        creadoNombre: nombreMalicioso,
      },
      { correlationId: "corr-1" },
    );

    expect(state.queries.join(" ")).not.toContain("DROP TABLE");
    expect(state.inputCalls.find(([n]) => n === "creadoNombre")?.[2]).toBe(nombreMalicioso);
  });
});

describe("pipeline.repository -> actualizarEtapa", () => {
  test("actualiza la etapa y agrega el hito con origen y destino en una transacción", async () => {
    state.results.push([], [], [filaOportunidad({ EtapaId: 2, EtapaCodigo: "CONTACTADO" })]);

    const res = await actualizarEtapa(7, 2, 1, {
      usuarioId: GUID,
      usuarioNombre: "Test",
      observacion: "Llamada realizada",
      correlationId: "corr-1",
      estado: "ACTIVA",
      fechaResultado: null,
    });

    expect(state.transaction.begin).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(state.queries[0]).toMatch(/UPDATE dbo\.Oportunidades/);
    expect(state.queries[0]).toMatch(/EtapaId\s*=\s*@etapaDestinoId/);
    expect(state.queries[0]).toMatch(/FechaIngresoEtapaUtc\s*=\s*SYSUTCDATETIME\(\)/);
    expect(state.queries[1]).toMatch(/INSERT INTO dbo\.OportunidadEtapaHistorial/);
    expect(state.inputCalls.find(([n]) => n === "etapaOrigenId")?.[2]).toBe(1);
    expect(state.inputCalls.find(([n]) => n === "etapaDestinoId")?.[2]).toBe(2);
    expect(res.etapa.codigo).toBe("CONTACTADO");
  });

  test("al cerrar la oportunidad persiste estado y fecha de resultado", async () => {
    state.results.push([], [], [filaOportunidad({ Estado: "GANADA", FechaResultadoUtc: new Date() })]);

    await actualizarEtapa(7, 8, 7, {
      usuarioId: GUID,
      usuarioNombre: "Test",
      observacion: null,
      correlationId: "corr-1",
      estado: "GANADA",
      fechaResultado: new Date("2026-11-16T12:00:00Z"),
    });

    expect(state.queries[0]).toMatch(/Estado\s*=\s*@estado/);
    expect(state.queries[0]).toMatch(/FechaResultadoUtc\s*=\s*@fechaResultado/);
    expect(state.inputCalls.find(([n]) => n === "estado")?.[2]).toBe("GANADA");
  });
});

describe("pipeline.repository -> marcarPerdida", () => {
  test("persiste estado PERDIDA, motivo y fecha de resultado", async () => {
    state.results.push([], [filaOportunidad({ Estado: "PERDIDA", MotivoPerdida: "Sin presupuesto" })]);

    const res = await marcarPerdida(7, "Sin presupuesto", {
      usuarioId: GUID,
      usuarioNombre: "Test",
    });

    expect(state.queries[0]).toMatch(/UPDATE dbo\.Oportunidades/);
    expect(state.queries[0]).toMatch(/Estado\s*=\s*N'PERDIDA'/);
    expect(state.queries[0]).toMatch(/MotivoPerdida\s*=\s*@motivo/);
    expect(state.queries[0]).toMatch(/FechaResultadoUtc\s*=\s*SYSUTCDATETIME\(\)/);
    expect(state.queries[0]).toMatch(/ActualizadoId\s*=\s*@usuarioId/);
    expect(state.inputCalls.find(([n]) => n === "motivo")?.[2]).toBe("Sin presupuesto");
    expect(state.inputCalls.find(([n]) => n === "usuarioId")?.[2]).toBe(GUID);
    expect(res.estado).toBe("PERDIDA");
  });
});

describe("pipeline.repository -> consultas de habilitación de cierre", () => {
  test("existeKycValidado filtra por oportunidad y estado VALIDADO", async () => {
    state.results.push([{ Existe: 1 }]);

    const res = await existeKycValidado(7);

    expect(res).toBe(true);
    expect(state.queries[0]).toMatch(/dbo\.KycExpedientes/);
    expect(state.queries[0]).toMatch(/Estado\s*=\s*N'VALIDADO'/);
    expect(state.inputCalls.find(([n]) => n === "oportunidadId")?.[2]).toBe(7);
  });

  test("existeCierreRegistrado filtra por oportunidad y estado REGISTRADO", async () => {
    state.results.push([{ Existe: 0 }]);

    const res = await existeCierreRegistrado(7);

    expect(res).toBe(false);
    expect(state.queries[0]).toMatch(/dbo\.CierresInversion/);
    expect(state.queries[0]).toMatch(/Estado\s*=\s*N'REGISTRADO'/);
  });
});

describe("pipeline.repository -> catálogo de etapas", () => {
  /**
   * Regresión real: `toEtapa` lee las columnas con prefijo
   * (`EtapaCodigo`, `EtapaOrden`, `EtapaPermiteCierre`). Si el SELECT del
   * catálogo no las aliasa, el mapeo devuelve `codigo`/`orden`
   * indefinidos y el avance secuencial deja de encontrar la etapa. Estos
   * tests usan la forma CRUDA que devuelve SQL, no la de dominio.
   */
  const filaCruda = (overrides: Record<string, unknown> = {}) => ({
    EtapaId: 2,
    EtapaCodigo: "CONTACTADO",
    EtapaNombre: "Contactado",
    EtapaOrden: 2,
    EtapaPermiteCierre: false,
    EtapaEsFinal: false,
    EtapaActivo: true,
    ...overrides,
  });

  test("findAllEtapas mapea las columnas aliasadas a la forma de dominio", async () => {
    state.results.push([filaCruda(), filaCruda({ EtapaId: 8, EtapaCodigo: "CERRADO_GANADO", EtapaOrden: 8, EtapaPermiteCierre: true, EtapaEsFinal: true })]);

    const res = await findAllEtapas();

    expect(res[0]).toEqual({
      etapaId: 2,
      codigo: "CONTACTADO",
      nombre: "Contactado",
      orden: 2,
      permiteCierre: false,
      esFinal: false,
      activo: true,
    });
    expect(res[1].permiteCierre).toBe(true);
    expect(res[1].codigo).toBe("CERRADO_GANADO");
    expect(state.queries[0]).toMatch(/Codigo\s+AS\s+EtapaCodigo/i);
    expect(state.queries[0]).toMatch(/Orden\s+AS\s+EtapaOrden/i);
    expect(state.queries[0]).toMatch(/PermiteCierre\s+AS\s+EtapaPermiteCierre/i);
  });

  test("findEtapasActivas solo lee etapas activas y las mapea igual", async () => {
    state.results.push([filaCruda()]);

    const res = await findEtapasActivas();

    expect(state.queries[0]).toMatch(/WHERE Activo = 1/);
    expect(res[0].codigo).toBe("CONTACTADO");
    expect(res[0].orden).toBe(2);
  });

  test("findMonedaActiva mapea la fila y devuelve null cuando no hay ninguna", async () => {
    state.results.push([{ MonedaCodigo: "PEN", Nombre: "Sol peruano", Simbolo: "S/" }]);

    const moneda = await findMonedaActiva("PEN");

    expect(moneda).toEqual({ monedaCodigo: "PEN", nombre: "Sol peruano", simbolo: "S/" });
    expect(state.queries[0]).toMatch(/Activo = 1/);

    state.results.push([]);
    expect(await findMonedaActiva("USD")).toBeNull();
  });
});

describe("pipeline.repository -> findHistorialByOportunidad", () => {
  test("devuelve los hitos con etapa de origen y destino resueltas", async () => {
    state.results.push([
      {
        HistorialId: 1,
        EtapaOrigenId: null,
        EtapaOrigenCodigo: null,
        EtapaOrigenNombre: null,
        EtapaDestinoId: 1,
        EtapaDestinoCodigo: "PROSPECTO",
        EtapaDestinoNombre: "Prospecto",
        FechaCambioUtc: new Date("2026-11-16T10:00:00Z"),
        UsuarioId: GUID,
        UsuarioNombre: "Test",
        Motivo: null,
        Observacion: null,
        CorrelationId: "corr-1",
      },
    ]);

    const res = await findHistorialByOportunidad(7);

    expect(res).toHaveLength(1);
    expect(res[0].etapaOrigen).toBeNull();
    expect(res[0].etapaDestino.codigo).toBe("PROSPECTO");
    expect(state.queries[0]).toMatch(/ORDER BY\s+h\.FechaCambioUtc/i);
  });
});
