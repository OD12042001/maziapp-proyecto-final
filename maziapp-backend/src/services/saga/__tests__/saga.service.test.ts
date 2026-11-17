jest.mock("../../../repositories/saga/saga.repository", () => ({
  asegurarSagaEnTx: jest.fn(),
  actualizarPasoEnTx: jest.fn(),
  actualizarEstadoInstanciaEnTx: jest.fn(),
  compensarOportunidadPorKycRechazadoEnTx: jest.fn(),
  findSagaByCorrelationId: jest.fn(),
}));

import * as repository from "../../../repositories/saga/saga.repository";
import { obtenerSaga, procesarEventoEnSaga } from "../saga.service";

const SAGA_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const MI_GUID = "11111111-2222-3333-4444-555555555555";
const OTRO_GUID = "99999999-8888-7777-6666-555555555555";

const freelance = {
  oid: MI_GUID,
  name: "Freelance",
  roles: ["ejecutivo_inversion"],
};

const admin = {
  oid: OTRO_GUID,
  name: "Admin",
  roles: ["administracion"],
};

const tx: any = { request: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
  (repository.asegurarSagaEnTx as jest.Mock).mockResolvedValue(SAGA_ID);
});

describe("saga.service (S4 BPM + SOA)", () => {
  test("avanza por los 4 pasos hasta COMPLETADA cuando llega ComisionCalculada", async () => {
    await procesarEventoEnSaga(
      {
        outboxId: "1",
        tipoEvento: "EtapaCambiada",
        agregado: "Oportunidad",
        agregadoId: "7",
        correlationId: "corr-1",
        intento: 1,
        creadoUtc: "2026-11-16T10:00:00.000Z",
        payload: { oportunidadId: 7 },
      },
      tx,
    );
    expect(repository.actualizarPasoEnTx).toHaveBeenCalledWith(
      tx,
      SAGA_ID,
      1,
      expect.objectContaining({ estado: "COMPLETADO" }),
    );

    await procesarEventoEnSaga(
      {
        outboxId: "2",
        tipoEvento: "KycEstadoCambiado",
        agregado: "KycExpediente",
        agregadoId: "3",
        correlationId: "corr-1",
        intento: 1,
        creadoUtc: "2026-11-16T10:05:00.000Z",
        payload: { oportunidadId: 7, estadoNuevo: "VALIDADO" },
      },
      tx,
    );
    expect(repository.actualizarPasoEnTx).toHaveBeenCalledWith(
      tx,
      SAGA_ID,
      2,
      expect.objectContaining({ estado: "COMPLETADO" }),
    );

    await procesarEventoEnSaga(
      {
        outboxId: "3",
        tipoEvento: "CierreGanadoRegistrado",
        agregado: "CierreInversion",
        agregadoId: "10",
        correlationId: "corr-1",
        intento: 1,
        creadoUtc: "2026-11-16T10:10:00.000Z",
        payload: { oportunidadId: 7, cierreId: 10 },
      },
      tx,
    );
    expect(repository.actualizarPasoEnTx).toHaveBeenCalledWith(
      tx,
      SAGA_ID,
      3,
      expect.objectContaining({ estado: "COMPLETADO" }),
    );

    await procesarEventoEnSaga(
      {
        outboxId: "4",
        tipoEvento: "ComisionCalculada",
        agregado: "Comision",
        agregadoId: "4",
        correlationId: "corr-1",
        intento: 1,
        creadoUtc: "2026-11-16T10:11:00.000Z",
        payload: { oportunidadId: 7, comisionId: 4 },
      },
      tx,
    );
    expect(repository.actualizarEstadoInstanciaEnTx).toHaveBeenLastCalledWith(
      tx,
      SAGA_ID,
      expect.objectContaining({
        pasoActual: 4,
        estado: "COMPLETADA",
        finalizada: true,
      }),
    );
  });

  test("compensa la oportunidad y marca la saga COMPENSADA cuando KYC es RECHAZADO o se revierte la comisión", async () => {
    await procesarEventoEnSaga(
      {
        outboxId: "5",
        tipoEvento: "KycEstadoCambiado",
        agregado: "KycExpediente",
        agregadoId: "3",
        correlationId: "corr-2",
        intento: 1,
        creadoUtc: "2026-11-16T10:05:00.000Z",
        payload: { oportunidadId: 7, estadoNuevo: "RECHAZADO" },
      },
      tx,
    );

    expect(
      repository.compensarOportunidadPorKycRechazadoEnTx,
    ).toHaveBeenCalledWith(tx, 7, "corr-2");
    expect(repository.actualizarEstadoInstanciaEnTx).toHaveBeenLastCalledWith(
      tx,
      SAGA_ID,
      expect.objectContaining({
        estado: "COMPENSADA",
        finalizada: true,
      }),
    );

    await procesarEventoEnSaga(
      {
        outboxId: "6",
        tipoEvento: "ComisionRevertida",
        agregado: "Comision",
        agregadoId: "4",
        correlationId: "corr-3",
        intento: 1,
        creadoUtc: "2026-11-16T10:20:00.000Z",
        payload: {
          oportunidadId: 7,
          motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
        },
      },
      tx,
    );
    expect(repository.actualizarPasoEnTx).toHaveBeenLastCalledWith(
      tx,
      SAGA_ID,
      4,
      expect.objectContaining({ estado: "COMPENSADO" }),
    );
  });

  test("obtenerSaga aplica visibilidad por cartera y retira responsableId", async () => {
    (repository.findSagaByCorrelationId as jest.Mock).mockResolvedValue({
      sagaInstanciaId: SAGA_ID,
      correlationId: "corr-saga-1",
      oportunidadId: 7,
      responsableId: OTRO_GUID,
      proceso: "KYC_CIERRE_COMISION",
      estado: "COMPLETADA",
      pasoActual: 4,
      iniciadaUtc: "2026-11-16T10:00:00.000Z",
      finalizadaUtc: "2026-11-16T10:15:00.000Z",
      ultimoError: null,
      pasos: [],
    });

    expect(await obtenerSaga("corr-saga-1", freelance)).toBeNull();

    const visibleAdmin = await obtenerSaga("corr-saga-1", admin);
    expect(visibleAdmin?.sagaInstanciaId).toBe(SAGA_ID);
    expect((visibleAdmin as any).responsableId).toBeUndefined();
  });
});
