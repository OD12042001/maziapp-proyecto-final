jest.mock("../../../config/sql", () => {
  const state: any = {
    inputCalls: [] as Array<[string, unknown, unknown]>,
    queries: [] as string[],
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
      const next = state.results.length > 0 ? state.results.shift() : {};
      if (next.reject) {
        throw next.reject;
      }
      return {
        recordset: next.recordset ?? [],
        rowsAffected: next.rowsAffected ?? [1],
      };
    },
  });

  state.transaction.request = makeRequest;

  const pool = {
    request: makeRequest,
    transaction: () => state.transaction,
  };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      UniqueIdentifier: "UniqueIdentifier",
      DateTime2: "DateTime2",
      Char: (n: number) => `Char(${n})`,
      NVarChar: (n: unknown) => `NVarChar(${String(n)})`,
      Decimal: () => "Decimal",
      MAX: "MAX",
    },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  CierreDuplicadoError,
  findCierreById,
  findCierres,
  findMonedaActiva,
  findOportunidadParaCierre,
  findProyectoById,
  saveCierre,
} from "../cierres.repository";

const state = (sqlConfig as any).__state;
const GUID = "11111111-2222-3333-4444-555555555555";
const FECHA = new Date("2026-11-16T15:00:00.000Z");

function filaCierre(overrides: Record<string, unknown> = {}) {
  return {
    CierreId: 10,
    OportunidadId: 7,
    MontoCaptado: "200000.00",
    MonedaCodigo: "PEN",
    FechaCierreUtc: FECHA,
    FreelanceId: GUID.toUpperCase(),
    Estado: "REGISTRADO",
    FechaAnulacionUtc: null,
    MotivoAnulacion: null,
    RegistradoPorId: GUID.toUpperCase(),
    RegistradoPorNombre: "Ejecutivo",
    ProyectoId: 1,
    ProyectoCodigo: "PRY-001",
    ProyectoNombre: "Expansión retail",
    ProyectoDescripcion: "Demo",
    ProyectoMonedaCodigo: "PEN",
    ProyectoMontoObjetivo: "5000000.00",
    ProyectoActivo: 1,
    ComisionId: null,
    ComisionEstado: null,
    ...overrides,
  };
}

beforeEach(() => {
  state.inputCalls.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
  jest.clearAllMocks();
});

describe("cierres.repository (S15)", () => {
  test("findOportunidadParaCierre, findProyectoById y findMonedaActiva mapean datos crudos", async () => {
    state.results.push({
      recordset: [
        {
          OportunidadId: 7,
          ResponsableId: GUID.toUpperCase(),
          Estado: "ACTIVA",
          KycEstado: "VALIDADO",
        },
      ],
    });
    const op = await findOportunidadParaCierre(7);
    expect(op?.kycEstado).toBe("VALIDADO");

    state.results.push({
      recordset: [
        {
          ProyectoId: 1,
          Codigo: "PRY-001",
          Nombre: "Expansión retail",
          Descripcion: "Demo",
          MonedaCodigo: "PEN ",
          MontoObjetivo: "5000000.00",
          Activo: 1,
        },
      ],
    });
    const pry = await findProyectoById(1);
    expect(pry?.monedaCodigo).toBe("PEN");
    expect(pry?.activo).toBe(true);

    state.results.push({ recordset: [{ MonedaCodigo: "PEN" }] });
    expect(await findMonedaActiva("PEN")).toBe(true);
  });

  test("saveCierre inserta cierre, audita en S40 y publica CierreGanadoRegistrado en la misma transacción", async () => {
    state.results.push(
      { recordset: [{ CierreId: 10 }] },
      { recordset: [filaCierre()] },
      { rowsAffected: [1] },
      { rowsAffected: [1] },
    );

    const cierre = await saveCierre({
      oportunidadId: 7,
      proyectoId: 1,
      montoCaptado: 200000,
      monedaCodigo: "PEN",
      fechaCierreUtc: FECHA,
      freelanceId: GUID,
      registradoPorId: GUID,
      registradoPorNombre: "Ejecutivo",
    });

    expect(state.transaction.begin).toHaveBeenCalledTimes(1);
    expect(state.transaction.commit).toHaveBeenCalledTimes(1);
    expect(state.queries.join(" ")).toContain("INSERT INTO dbo.CierresInversion");
    expect(state.queries.join(" ")).toContain("INSERT INTO dbo.AuditoriaEventos");
    expect(state.queries.join(" ")).toContain("INSERT INTO dbo.OutboxEventos");
    expect(cierre.cierreId).toBe(10);
    expect(cierre.freelanceId).toBe(GUID);
  });

  test("saveCierre traduce la violación UNIQUE a CierreDuplicadoError y revierte", async () => {
    const dup: any = new Error("UQ_CierresInversion_Oportunidad");
    dup.number = 2627;
    state.results.push({ reject: dup });

    await expect(
      saveCierre({
        oportunidadId: 7,
        proyectoId: 1,
        montoCaptado: 200000,
        monedaCodigo: "PEN",
        fechaCierreUtc: FECHA,
        freelanceId: GUID,
        registradoPorId: GUID,
        registradoPorNombre: "Ejecutivo",
      }),
    ).rejects.toBeInstanceOf(CierreDuplicadoError);

    expect(state.transaction.rollback).toHaveBeenCalledTimes(1);
  });

  test("findCierres y findCierreById consultan y mapean la comisión asociada", async () => {
    state.results.push(
      { recordset: [{ Total: 1 }] },
      { recordset: [filaCierre({ ComisionId: 4, ComisionEstado: "PENDIENTE" })] },
    );

    const page = await findCierres({
      proyectoId: 1,
      freelanceId: GUID,
      estado: "REGISTRADO",
      page: 1,
      pageSize: 20,
    });
    expect(page.total).toBe(1);
    expect(page.items[0].comisionId).toBe(4);
    expect(page.items[0].comisionEstado).toBe("PENDIENTE");

    state.results.push({ recordset: [] });
    expect(await findCierreById(999)).toBeNull();
  });
});
