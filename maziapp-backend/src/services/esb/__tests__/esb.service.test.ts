jest.mock("../../../config/sql", () => {
  const tx = {
    begin: jest.fn(async () => undefined),
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
    request: jest.fn(),
  };

  const pool = {
    transaction: () => tx,
    request: jest.fn(),
  };

  return {
    getPool: jest.fn(async () => pool),
    __tx: tx,
  };
});

jest.mock("../../../repositories/auditoria/auditoria.repository", () => ({
  registrarEvento: jest.fn(async () => undefined),
}));

jest.mock("../../saga/saga.service", () => ({
  procesarEventoEnSaga: jest.fn(async () => undefined),
}));

jest.mock(
  "../../../repositories/configuracion/configuracion.repository",
  () => ({
    findParametroEntero: jest.fn(),
  }),
);

jest.mock("../../../repositories/esb/outbox.repository", () => ({
  reclamarLote: jest.fn(),
  registrarConsumo: jest.fn(),
  marcarPublicado: jest.fn(),
  marcarFallo: jest.fn(),
  findOutbox: jest.fn(),
  findOutboxById: jest.fn(),
}));

import * as sqlConfig from "../../../config/sql";
import * as auditoria from "../../../repositories/auditoria/auditoria.repository";
import * as configuracion from "../../../repositories/configuracion/configuracion.repository";
import * as repository from "../../../repositories/esb/outbox.repository";
import {
  registrarConsumidor,
  reiniciarConsumidores,
} from "../esb.consumidores";
import {
  calcularBackoffSegundos,
  EsbNoConfiguradoError,
  listarFallidos,
  listarOutbox,
  obtenerOutbox,
  procesarOutbox,
} from "../esb.service";

const tx = (sqlConfig as any).__tx;

function configurarParametros(max = 5, base = 10, tope = 300) {
  (configuracion.findParametroEntero as jest.Mock).mockImplementation(
    async (clave: string) => {
      if (clave === "ESB_MAX_REINTENTOS") return max;
      if (clave === "ESB_BACKOFF_BASE_SEGUNDOS") return base;
      if (clave === "ESB_BACKOFF_MAX_SEGUNDOS") return tope;
      return null;
    },
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  reiniciarConsumidores();
  configurarParametros();
});

describe("esb.service (despachador del outbox)", () => {
  test("calcularBackoffSegundos aplica backoff exponencial acotado por el máximo", () => {
    expect(calcularBackoffSegundos(1, 10, 300)).toBe(10);
    expect(calcularBackoffSegundos(2, 10, 300)).toBe(20);
    expect(calcularBackoffSegundos(3, 10, 300)).toBe(40);
    expect(calcularBackoffSegundos(6, 10, 300)).toBe(300);
  });

  test("lanza EsbNoConfiguradoError cuando falta un parámetro del ESB", async () => {
    (configuracion.findParametroEntero as jest.Mock).mockResolvedValue(null);

    await expect(procesarOutbox(10)).rejects.toBeInstanceOf(
      EsbNoConfiguradoError,
    );
  });

  test("despacha lote, ejecuta consumidores de forma idempotente y marca PUBLICADO", async () => {
    (repository.reclamarLote as jest.Mock).mockResolvedValue([
      {
        outboxId: "1",
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: "7",
        payload: { oportunidadId: 7 },
        correlationId: "corr-1",
        idempotencyKey: "EtapaCambiada:7:2",
        estado: "EN_PROCESO",
        intentos: 1,
        proximoIntentoUtc: "2026-11-16T12:00:00.000Z",
        ultimoError: null,
        creadoFechaUtc: "2026-11-16T11:59:00.000Z",
        procesadoFechaUtc: null,
      },
    ]);
    (repository.registrarConsumo as jest.Mock).mockResolvedValue(true);
    (repository.marcarPublicado as jest.Mock).mockResolvedValue(true);

    const res = await procesarOutbox(20);

    expect(res).toEqual({
      procesados: 1,
      publicados: 1,
      fallidos: 0,
      muertos: 0,
    });
    expect(repository.registrarConsumo).toHaveBeenCalledWith(
      tx,
      "1",
      "TrazaAuditoria",
    );
    expect(auditoria.registrarEvento).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        servicioCodigo: "ESB",
        operacion: "EntregaEvento",
        entidad: "Oportunidad",
        entidadId: "7",
      }),
      expect.objectContaining({ correlationId: "corr-1" }),
    );
    expect(repository.marcarPublicado).toHaveBeenCalledWith("1");
  });

  test("si el consumidor ya había procesado el mensaje, omite su efecto sin fallar", async () => {
    const manejador = jest.fn();
    registrarConsumidor({
      nombre: "ConsumidorPrueba",
      tipos: ["EtapaCambiada"],
      manejar: manejador,
    });

    (repository.reclamarLote as jest.Mock).mockResolvedValue([
      {
        outboxId: "2",
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: "7",
        payload: {},
        correlationId: "corr-2",
        idempotencyKey: "EtapaCambiada:7:2",
        estado: "EN_PROCESO",
        intentos: 2,
        proximoIntentoUtc: "2026-11-16T12:00:00.000Z",
        ultimoError: null,
        creadoFechaUtc: "2026-11-16T11:59:00.000Z",
        procesadoFechaUtc: null,
      },
    ]);
    // Ya consumido por ambos consumidores
    (repository.registrarConsumo as jest.Mock).mockResolvedValue(false);
    (repository.marcarPublicado as jest.Mock).mockResolvedValue(true);

    const res = await procesarOutbox(10);

    expect(manejador).not.toHaveBeenCalled();
    expect(res.publicados).toBe(1);
  });

  test("ante fallo de un consumidor programa reintento (FALLIDO) o pasa a MUERTO al agotar intentos", async () => {
    registrarConsumidor({
      nombre: "ConsumidorQueFalla",
      tipos: ["EtapaCambiada"],
      async manejar() {
        throw new Error("Servicio destino caído");
      },
    });

    (repository.registrarConsumo as jest.Mock).mockResolvedValue(true);
    (repository.marcarFallo as jest.Mock).mockResolvedValue(true);

    (repository.reclamarLote as jest.Mock).mockResolvedValue([
      {
        outboxId: "10",
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: "7",
        payload: {},
        correlationId: "corr-10",
        idempotencyKey: "EtapaCambiada:7:2",
        estado: "EN_PROCESO",
        intentos: 2, // menor que maxReintentos=5 -> FALLIDO
        proximoIntentoUtc: "2026-11-16T12:00:00.000Z",
        ultimoError: null,
        creadoFechaUtc: "2026-11-16T11:59:00.000Z",
        procesadoFechaUtc: null,
      },
      {
        outboxId: "11",
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: "8",
        payload: {},
        correlationId: "corr-11",
        idempotencyKey: "EtapaCambiada:8:2",
        estado: "EN_PROCESO",
        intentos: 5, // igual a maxReintentos=5 -> MUERTO (DLQ)
        proximoIntentoUtc: "2026-11-16T12:00:00.000Z",
        ultimoError: null,
        creadoFechaUtc: "2026-11-16T11:59:00.000Z",
        procesadoFechaUtc: null,
      },
    ]);

    const res = await procesarOutbox(10);

    expect(res).toEqual({
      procesados: 2,
      publicados: 0,
      fallidos: 1,
      muertos: 1,
    });
    expect(repository.marcarFallo).toHaveBeenNthCalledWith(
      1,
      "10",
      expect.stringContaining("Servicio destino caído"),
      expect.any(Date),
    );
    expect(repository.marcarFallo).toHaveBeenNthCalledWith(
      2,
      "11",
      expect.stringContaining("Servicio destino caído"),
      null,
    );
  });

  test("listarOutbox, listarFallidos y obtenerOutbox delegan en el repositorio", async () => {
    (repository.findOutbox as jest.Mock).mockResolvedValue({
      items: [{ outboxId: "1" }],
      total: 1,
    });
    (repository.findOutboxById as jest.Mock).mockResolvedValue({
      outboxId: "1",
    });

    const outbox = await listarOutbox({ page: 1, pageSize: 20 });
    expect(outbox.total).toBe(1);

    const dlq = await listarFallidos({ page: 1, pageSize: 20 });
    expect(dlq.total).toBe(1);
    expect(repository.findOutbox).toHaveBeenLastCalledWith({
      estado: "MUERTO",
      page: 1,
      pageSize: 20,
    });

    expect(await obtenerOutbox("1")).toEqual({ outboxId: "1" });
  });
});
