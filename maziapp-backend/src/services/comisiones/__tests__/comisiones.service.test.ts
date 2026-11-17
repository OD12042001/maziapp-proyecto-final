jest.mock(
  "../../../repositories/configuracion/configuracion.repository",
  () => ({
    findParametroDecimal: jest.fn(),
    findParametroEntero: jest.fn(),
  }),
);

jest.mock("../../../repositories/cierres/cierres.repository", () => ({
  findCierreById: jest.fn(),
}));

jest.mock("../../../repositories/comisiones/comisiones.repository", () => ({
  findComisiones: jest.fn(),
  findComisionById: jest.fn(),
  registrarComisionEnTx: jest.fn(),
  revertirComision: jest.fn(),
}));

jest.mock("../../auditoria/auditoria.service", () => ({
  conAuditoriaDeRechazo: jest.fn((_meta, _pred, fn) => fn()),
}));

import * as cierresRepo from "../../../repositories/cierres/cierres.repository";
import * as repository from "../../../repositories/comisiones/comisiones.repository";
import * as configuracion from "../../../repositories/configuracion/configuracion.repository";
import {
  calcularComisionParaCierreEnTx,
  ComisionEstadoNoPermitidoError,
  ComisionNoConfiguradaError,
  ComisionPlazoReversionVencidoError,
  desglosarComision,
  listarComisiones,
  obtenerComision,
  revertir,
} from "../comisiones.service";

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("comisiones.service (S16/S17)", () => {
  test("desglosarComision reproduce la tabla aritmética de APF2 (200 000 al 3 % con IGV 18 %)", () => {
    const desglose = desglosarComision(200000, 3, 18);

    expect(desglose).toEqual({
      importeTotal: 6000,
      baseImponible: 5084.75,
      importeIgv: 915.25,
    });
    expect(desglose.baseImponible + desglose.importeIgv).toBe(
      desglose.importeTotal,
    );
  });

  test("calcularComisionParaCierreEnTx lee parámetros y delega en registrarComisionEnTx", async () => {
    (configuracion.findParametroDecimal as jest.Mock).mockImplementation(
      async (clave: string) => {
        if (clave === "COMISION_TASA_PORCENTAJE") return 3;
        if (clave === "COMISION_IGV_PORCENTAJE") return 18;
        return null;
      },
    );
    (cierresRepo.findCierreById as jest.Mock).mockResolvedValue({
      cierreId: 10,
      freelanceId: MI_GUID,
      monedaCodigo: "PEN",
      montoCaptado: 200000,
      registradoPorId: MI_GUID,
      registradoPorNombre: "Freelance",
    });
    (repository.registrarComisionEnTx as jest.Mock).mockResolvedValue({
      comisionId: 4,
      importeTotal: 6000,
    });

    const tx: any = { request: jest.fn() };
    const com = await calcularComisionParaCierreEnTx(tx, 10, "corr-1");

    expect(com.comisionId).toBe(4);
    expect(repository.registrarComisionEnTx).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        cierreId: 10,
        importeTotal: 6000,
        baseImponible: 5084.75,
        importeIgv: 915.25,
      }),
      "corr-1",
    );
  });

  test("calcularComisionParaCierreEnTx falla si falta COMISION_TASA_PORCENTAJE", async () => {
    (configuracion.findParametroDecimal as jest.Mock).mockResolvedValue(null);

    await expect(
      calcularComisionParaCierreEnTx({ request: jest.fn() } as any, 10),
    ).rejects.toBeInstanceOf(ComisionNoConfiguradaError);
  });

  test("revertir rechaza comisión LIQUIDADA, REVERTIDA o fuera del plazo de reversión", async () => {
    (configuracion.findParametroEntero as jest.Mock).mockResolvedValue(30);

    (repository.findComisionById as jest.Mock).mockResolvedValueOnce({
      comisionId: 4,
      estado: "LIQUIDADA",
      fechaCalculoUtc: "2026-11-01T00:00:00.000Z",
    });
    await expect(
      revertir(
        4,
        {
          motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
          fechaEvaluacionUtc: new Date("2026-11-10T00:00:00.000Z"),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ComisionEstadoNoPermitidoError);

    (repository.findComisionById as jest.Mock).mockResolvedValueOnce({
      comisionId: 4,
      estado: "REVERTIDA",
      fechaCalculoUtc: "2026-11-01T00:00:00.000Z",
    });
    await expect(
      revertir(
        4,
        {
          motivoCodigo: "KYC_RECHAZADO",
          fechaEvaluacionUtc: new Date("2026-11-10T00:00:00.000Z"),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ComisionEstadoNoPermitidoError);

    // Día 31 con plazo 30 -> vencido
    (repository.findComisionById as jest.Mock).mockResolvedValueOnce({
      comisionId: 4,
      estado: "PENDIENTE",
      fechaCalculoUtc: "2026-10-01T00:00:00.000Z",
    });
    await expect(
      revertir(
        4,
        {
          motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
          fechaEvaluacionUtc: new Date("2026-11-01T12:00:00.000Z"),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ComisionPlazoReversionVencidoError);
  });

  test("revertir procede dentro del plazo sobre una comisión PENDIENTE", async () => {
    (configuracion.findParametroEntero as jest.Mock).mockResolvedValue(30);
    (repository.findComisionById as jest.Mock).mockResolvedValue({
      comisionId: 4,
      estado: "PENDIENTE",
      fechaCalculoUtc: "2026-11-01T00:00:00.000Z",
    });
    (repository.revertirComision as jest.Mock).mockResolvedValue({
      comisionId: 4,
      estado: "REVERTIDA",
    });

    const rev = await revertir(
      4,
      {
        motivoCodigo: "DESEMBOLSO_NO_CONCRETADO",
        fechaEvaluacionUtc: new Date("2026-11-15T00:00:00.000Z"),
      },
      admin,
    );

    expect(rev?.estado).toBe("REVERTIDA");
  });

  test("listarComisiones y obtenerComision aplican visibilidad por rol", async () => {
    (repository.findComisiones as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
    });

    await listarComisiones(freelance, {
      freelanceId: OTRO_GUID,
      page: 1,
      pageSize: 20,
    });
    expect(repository.findComisiones).toHaveBeenLastCalledWith(
      expect.objectContaining({ freelanceId: MI_GUID }),
    );

    (repository.findComisionById as jest.Mock).mockResolvedValue({
      comisionId: 4,
      freelanceId: OTRO_GUID,
    });
    expect(await obtenerComision(4, freelance)).toBeNull();
    expect((await obtenerComision(4, admin))?.comisionId).toBe(4);
  });
});
