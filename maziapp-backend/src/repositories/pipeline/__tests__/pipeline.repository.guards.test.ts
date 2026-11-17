/**
 * Guardas del repositorio de Pipeline (S06) que los tests de servicio no
 * pueden ver:
 *
 *   1. el mapeo de la fila CRUDA de la vista al contrato `Oportunidad`
 *      (el modo exacto de fallo documentado en L10: `toEtapa` lee
 *      columnas con prefijo y un SELECT sin aliasar devuelve `undefined`);
 *   2. la relectura ocurre ANTES del commit, no después;
 *   3. perder no inserta hito de etapa (perder no es un cambio de etapa).
 */
jest.mock("../../../config/sql", () => {
  const state: any = { order: [] as string[], queries: [] as string[], results: [] as any[] };

  const makeRequest = () => ({
    input() {
      return this;
    },
    async query(text: string) {
      state.queries.push(text);
      state.order.push("query");

      return {
        recordset: state.results.length > 0 ? state.results.shift() : [],
        rowsAffected: [
          state.rowsAffected && state.rowsAffected.length > 0
            ? state.rowsAffected.shift()
            : 1,
        ],
      };
    },
  });

  const transaction = {
    begin: jest.fn(async () => {
      state.order.push("begin");
    }),
    commit: jest.fn(async () => {
      state.order.push("commit");
    }),
    rollback: jest.fn(async () => {
      state.order.push("rollback");
    }),
    request: makeRequest,
  };

  const pool = { request: makeRequest, transaction: () => transaction };

  return {
    getPool: async () => pool,
    sql: {
      Int: "Int",
      UniqueIdentifier: "UniqueIdentifier",
      DateTime2: "DateTime2",
      NVarChar: (n: number) => `NVarChar(${n})`,
      Char: (n: number) => `Char(${n})`,
      Decimal: () => "Decimal",
    },
    __state: state,
  };
});

import * as sqlConfig from "../../../config/sql";
import {
  findOportunidadById,
  actualizarEtapa,
  marcarPerdida,
  PipelineConflictoConcurrenciaError,
} from "../pipeline.repository";

const state = (sqlConfig as any).__state;
const GUID = "11111111-2222-3333-4444-555555555555";

const FILA_VISTA = {
  OportunidadId: 7,
  ContactoId: 20,
  ResponsableId: "C5F70284-66E8-4A20-B314-8AE2EDC81779",
  Estado: "ACTIVA",
  MontoEstimado: "1500.50",
  MonedaCodigo: "PEN",
  FechaCreacionUtc: new Date("2026-11-16T10:00:00.000Z"),
  FechaIngresoEtapaUtc: new Date("2026-11-16T11:00:00.000Z"),
  FechaResultadoUtc: null,
  MotivoPerdida: null,
  EtapaId: 2,
  EtapaCodigo: "CONTACTADO",
  EtapaNombre: "Contactado",
  EtapaOrden: 2,
  EtapaPermiteCierre: false,
  EtapaEsFinal: false,
  EtapaActivo: true,
  NombreCompleto: "Inversiones Andinas S.A.C.",
  KycExpedienteId: null,
  KycEstado: "VALIDADO",
  CierreId: 3,
  MontoCaptado: "1500.50",
  FechaCierreUtc: new Date("2026-11-16T12:00:00.000Z"),
  ComisionId: 4,
  ComisionImporteTotal: "45.00",
  ComisionEstado: "PENDIENTE",
};

beforeEach(() => {
  state.order.length = 0;
  state.queries.length = 0;
  state.results.length = 0;
  state.rowsAffected = [];
});

describe("pipeline.repository -> findOportunidadById", () => {
  test("mapea la fila cruda de la vista al contrato Oportunidad", async () => {
    state.results.push([FILA_VISTA]);

    const op = await findOportunidadById(7);

    expect(state.queries[0]).toMatch(
      /vw_OportunidadResumen\s+WHERE OportunidadId = @oportunidadId/,
    );
    expect(op).toEqual({
      oportunidadId: 7,
      contactoId: 20,
      contactoNombre: "Inversiones Andinas S.A.C.",
      responsableId: FILA_VISTA.ResponsableId,
      estado: "ACTIVA",
      montoEstimado: 1500.5,
      monedaCodigo: "PEN",
      etapa: {
        etapaId: 2,
        codigo: "CONTACTADO",
        nombre: "Contactado",
        orden: 2,
        permiteCierre: false,
        esFinal: false,
        activo: true,
      },
      fechaCreacionUtc: "2026-11-16T10:00:00.000Z",
      fechaIngresoEtapaUtc: "2026-11-16T11:00:00.000Z",
      fechaResultadoUtc: null,
      motivoPerdida: null,
      kycEstado: "VALIDADO",
      cierreId: 3,
      comisionId: 4,
    });
  });
});

describe("pipeline.repository -> atomicidad de las escrituras", () => {
  test("actualizarEtapa relee ANTES del commit", async () => {
    state.results.push(
      [],
      [],
      [{ ...FILA_VISTA, EtapaId: 3, EtapaCodigo: "CALIFICADO", EtapaOrden: 3 }],
    );

    await actualizarEtapa(7, 3, 2, {
      usuarioId: GUID,
      usuarioNombre: "Test",
      observacion: null,
      correlationId: "corr-1",
      estado: "ACTIVA",
      fechaResultado: null,
    });

    expect(state.order).toEqual([
      "begin",
      "query",
      "query",
      "query",
      "query",
      "query",
      "commit",
    ]);
    expect(state.queries[2]).toMatch(/vw_OportunidadResumen/);
    expect(state.queries[3]).toMatch(/INSERT INTO dbo\.AuditoriaEventos/);
    expect(state.queries[4]).toMatch(/INSERT INTO dbo\.OutboxEventos/);
  });

  test("marcarPerdida no inserta hito de etapa y registra al usuario", async () => {
    state.results.push(
      [],
      [{ ...FILA_VISTA, Estado: "PERDIDA", MotivoPerdida: "Sin presupuesto" }],
      [],
    );

    await marcarPerdida(7, "Sin presupuesto", {
      usuarioId: GUID,
      usuarioNombre: "Test",
    });

    expect(state.queries.join(" ")).not.toMatch(/OportunidadEtapaHistorial/i);
    expect(state.queries[0]).toMatch(/ActualizadoId\s*=\s*@usuarioId/);
    expect(state.queries[2]).toMatch(/INSERT INTO dbo\.AuditoriaEventos/);
    expect(state.order).toEqual(["begin", "query", "query", "query", "commit"]);
  });

  test("actualizarEtapa y marcarPerdida revierten y lanzan PipelineConflictoConcurrenciaError cuando rowsAffected = 0", async () => {
    state.rowsAffected = [0];

    await expect(
      actualizarEtapa(7, 3, 2, {
        usuarioId: GUID,
        usuarioNombre: "Test",
        observacion: null,
        correlationId: "corr-race",
        estado: "ACTIVA",
        fechaResultado: null,
      }),
    ).rejects.toBeInstanceOf(PipelineConflictoConcurrenciaError);

    expect(state.queries[0]).toMatch(/AND EtapaId = @etapaOrigenId/);
    expect(state.queries[0]).toMatch(/AND Estado = N'ACTIVA'/);
    expect(state.order).toEqual(["begin", "query", "rollback"]);

    state.order.length = 0;
    state.queries.length = 0;
    state.rowsAffected = [0];

    await expect(
      marcarPerdida(7, "Sin presupuesto", {
        usuarioId: GUID,
        usuarioNombre: "Test",
      }),
    ).rejects.toBeInstanceOf(PipelineConflictoConcurrenciaError);

    expect(state.queries[0]).toMatch(/AND Estado = N'ACTIVA'/);
    expect(state.order).toEqual(["begin", "query", "rollback"]);
  });
});
