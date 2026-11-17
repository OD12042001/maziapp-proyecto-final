jest.mock("../../../repositories/cierres/cierres.repository", () => {
  class CierreDuplicadoError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "CierreDuplicadoError";
    }
  }

  return {
    CierreDuplicadoError,
    findOportunidadParaCierre: jest.fn(),
    findCierreByOportunidad: jest.fn(),
    findProyectoById: jest.fn(),
    findMonedaActiva: jest.fn(),
    findCierreById: jest.fn(),
    findCierres: jest.fn(),
    saveCierre: jest.fn(),
  };
});

jest.mock("../../auditoria/auditoria.service", () => ({
  conAuditoriaDeRechazo: jest.fn((_meta, _pred, fn) => fn()),
}));

import * as repository from "../../../repositories/cierres/cierres.repository";
import {
  CierreDuplicadoError,
  CierreKycNoValidadoError,
  CierreMonedaInvalidaError,
  CierreOportunidadNoValidaError,
  CierreProyectoInvalidoError,
  listarCierres,
  obtenerCierre,
  registrarCierre,
} from "../cierres.service";

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

const INPUT = {
  oportunidadId: 7,
  proyectoId: 1,
  montoCaptado: 200000,
  monedaCodigo: "PEN" as const,
  fechaCierreUtc: new Date("2026-11-16T15:00:00.000Z"),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("cierres.service (S15)", () => {
  test("devuelve null cuando la oportunidad no existe o pertenece a otra cartera", async () => {
    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValueOnce(
      null,
    );
    expect(await registrarCierre(INPUT, freelance)).toBeNull();

    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValueOnce({
      oportunidadId: 7,
      responsableId: OTRO_GUID,
      estado: "ACTIVA",
      kycEstado: "VALIDADO",
    });
    expect(await registrarCierre(INPUT, freelance)).toBeNull();
  });

  test("rechaza cuando la oportunidad está PERDIDA o el KYC no está VALIDADO", async () => {
    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValueOnce({
      oportunidadId: 7,
      responsableId: MI_GUID,
      estado: "PERDIDA",
      kycEstado: "VALIDADO",
    });
    await expect(registrarCierre(INPUT, freelance)).rejects.toBeInstanceOf(
      CierreOportunidadNoValidaError,
    );

    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValueOnce({
      oportunidadId: 7,
      responsableId: MI_GUID,
      estado: "ACTIVA",
      kycEstado: "EN_PROCESO",
    });
    await expect(registrarCierre(INPUT, freelance)).rejects.toBeInstanceOf(
      CierreKycNoValidadoError,
    );
  });

  test("rechaza cierre duplicado, proyecto inactivo o moneda inactiva", async () => {
    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValue({
      oportunidadId: 7,
      responsableId: MI_GUID,
      estado: "ACTIVA",
      kycEstado: "VALIDADO",
    });

    (repository.findCierreByOportunidad as jest.Mock).mockResolvedValueOnce({
      cierreId: 1,
    });
    await expect(registrarCierre(INPUT, freelance)).rejects.toBeInstanceOf(
      CierreDuplicadoError,
    );

    (repository.findCierreByOportunidad as jest.Mock).mockResolvedValue(null);
    (repository.findProyectoById as jest.Mock).mockResolvedValueOnce({
      proyectoId: 1,
      activo: false,
    });
    await expect(registrarCierre(INPUT, freelance)).rejects.toBeInstanceOf(
      CierreProyectoInvalidoError,
    );

    (repository.findProyectoById as jest.Mock).mockResolvedValue({
      proyectoId: 1,
      activo: true,
    });
    (repository.findMonedaActiva as jest.Mock).mockResolvedValueOnce(false);
    await expect(registrarCierre(INPUT, freelance)).rejects.toBeInstanceOf(
      CierreMonedaInvalidaError,
    );
  });

  test("registra el cierre cuando se cumplen todas las precondiciones", async () => {
    (repository.findOportunidadParaCierre as jest.Mock).mockResolvedValue({
      oportunidadId: 7,
      responsableId: MI_GUID.toUpperCase(),
      estado: "ACTIVA",
      kycEstado: "VALIDADO",
    });
    (repository.findCierreByOportunidad as jest.Mock).mockResolvedValue(null);
    (repository.findProyectoById as jest.Mock).mockResolvedValue({
      proyectoId: 1,
      activo: true,
    });
    (repository.findMonedaActiva as jest.Mock).mockResolvedValue(true);
    (repository.saveCierre as jest.Mock).mockResolvedValue({
      cierreId: 10,
      oportunidadId: 7,
    });

    const creado = await registrarCierre(INPUT, freelance);
    expect(creado?.cierreId).toBe(10);
  });

  test("listarCierres y obtenerCierre aplican visibilidad de cartera", async () => {
    (repository.findCierres as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await listarCierres(freelance, {
      freelanceId: OTRO_GUID,
      page: 1,
      pageSize: 20,
    });
    expect(repository.findCierres).toHaveBeenLastCalledWith(
      expect.objectContaining({ freelanceId: MI_GUID }),
    );

    await listarCierres(admin, {
      freelanceId: OTRO_GUID,
      page: 1,
      pageSize: 20,
    });
    expect(repository.findCierres).toHaveBeenLastCalledWith(
      expect.objectContaining({ freelanceId: OTRO_GUID }),
    );

    (repository.findCierreById as jest.Mock).mockResolvedValue({
      cierreId: 10,
      freelanceId: OTRO_GUID,
    });
    expect(await obtenerCierre(10, freelance)).toBeNull();
    expect((await obtenerCierre(10, admin))?.cierreId).toBe(10);
  });
});
