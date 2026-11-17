/**
 * pipeline.service (S06) — reglas de negocio.
 *
 * Se mockean los módulos de los que depende el service (repository y
 * contacto.service), nunca la base de datos. El objetivo es probar las
 * reglas que el contrato aprobado declara:
 * - visibilidad: el freelance ve su cartera; dirección y gerencia ven todo;
 * - anti-enumeración: null cuando no existe o no es visible;
 * - creación: la etapa inicial sale del catálogo, no de una constante;
 * - avance secuencial, cierre habilitado solo con KYC validado y cierre
 *   registrado, y paso a GANADA al entrar a la etapa de cierre.
 */
import * as repository from "../../../repositories/pipeline/pipeline.repository";
import * as contactoService from "../../contactos/contacto.service";
import {
  listarEtapas,
  listarOportunidades,
  crearOportunidad,
  obtenerOportunidad,
  avanzarEtapa,
  marcarPerdida,
  obtenerHistorial,
  PipelineMonedaInvalidaError,
  PipelineSinEtapaInicialError,
  PipelineOportunidadCerradaError,
  PipelineEtapaNoSecuencialError,
  PipelineCierreNoHabilitadoError,
} from "../pipeline.service";

jest.mock("../../../repositories/pipeline/pipeline.repository");
jest.mock("../../contactos/contacto.service");

const MI_GUID = "11111111-2222-3333-4444-555555555555";
const OTRO_GUID = "99999999-8888-7777-6666-555555555555";

const freelance = {
  oid: MI_GUID,
  name: "Freelance",
  preferred_username: "f@example.com",
  roles: ["ejecutivo_inversion"],
} as any;

const direccion = {
  oid: OTRO_GUID,
  name: "Dirección",
  preferred_username: "d@example.com",
  roles: ["direccion_comercial"],
} as any;

const etapas = [
  {
    etapaId: 1,
    codigo: "PROSPECTO",
    nombre: "Prospecto",
    orden: 1,
    permiteCierre: false,
    esFinal: false,
    activo: true,
  },
  {
    etapaId: 2,
    codigo: "CONTACTADO",
    nombre: "Contactado",
    orden: 2,
    permiteCierre: false,
    esFinal: false,
    activo: true,
  },
  {
    etapaId: 8,
    codigo: "CERRADO_GANADO",
    nombre: "Cerrado-ganado",
    orden: 8,
    permiteCierre: true,
    esFinal: true,
    activo: true,
  },
];

function oportunidad(overrides: Record<string, unknown> = {}) {
  return {
    oportunidadId: 7,
    contactoId: 20,
    contactoNombre: "Inversiones Andinas S.A.C.",
    responsableId: MI_GUID.toUpperCase(),
    estado: "ACTIVA",
    montoEstimado: 200000,
    monedaCodigo: "PEN",
    etapa: etapas[0],
    fechaCreacionUtc: "2026-11-16T10:00:00.000Z",
    fechaIngresoEtapaUtc: "2026-11-16T10:00:00.000Z",
    fechaResultadoUtc: null,
    motivoPerdida: null,
    kycEstado: null,
    cierreId: null,
    comisionId: null,
    ...overrides,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("pipeline.service -> listarEtapas", () => {
  test("delega en el catálogo", async () => {
    (repository.findAllEtapas as jest.Mock).mockResolvedValue(etapas);

    const res = await listarEtapas();

    expect(res).toEqual(etapas);
    expect(repository.findAllEtapas).toHaveBeenCalledTimes(1);
  });
});

describe("pipeline.service -> listarOportunidades (visibilidad)", () => {
  test("el freelance queda acotado a su propio oid e ignora el responsableId de la query", async () => {
    (repository.findOportunidades as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    const res = await listarOportunidades(freelance, {
      responsableId: OTRO_GUID,
      page: 1,
      pageSize: 20,
    });

    expect(repository.findOportunidades).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: MI_GUID }),
    );
    expect(res).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  test("dirección comercial ve todas: no fuerza responsableId si no lo piden", async () => {
    (repository.findOportunidades as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await listarOportunidades(direccion, { page: 1, pageSize: 20 });

    expect(repository.findOportunidades).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: undefined }),
    );
  });

  test("dirección comercial puede filtrar por un responsable concreto", async () => {
    (repository.findOportunidades as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await listarOportunidades(direccion, {
      responsableId: MI_GUID,
      page: 2,
      pageSize: 10,
    });

    expect(repository.findOportunidades).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: MI_GUID, page: 2, pageSize: 10 }),
    );
  });

  test("gerencia general también ve todas", async () => {
    (repository.findOportunidades as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await listarOportunidades(
      { ...direccion, roles: ["gerencia_general"] } as any,
      { page: 1, pageSize: 20 },
    );

    expect(repository.findOportunidades).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: undefined }),
    );
  });

  test("compara roles sin distinguir mayúsculas", async () => {
    (repository.findOportunidades as jest.Mock).mockResolvedValue({ items: [], total: 0 });

    await listarOportunidades(
      { ...direccion, roles: ["Direccion_Comercial"] } as any,
      { page: 1, pageSize: 20 },
    );

    expect(repository.findOportunidades).toHaveBeenCalledWith(
      expect.objectContaining({ responsableId: undefined }),
    );
  });
});

describe("pipeline.service -> crearOportunidad", () => {
  test("null cuando el contacto no existe o no es del usuario, sin escribir nada", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

    const res = await crearOportunidad({ contactoId: 20 } as any, freelance, "corr-1");

    expect(res).toBeNull();
    expect(repository.saveOportunidad).not.toHaveBeenCalled();
  });

  test("la etapa inicial es la primera activa por orden, no una constante", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({ id: "20" });
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue([etapas[1], etapas[0]]);
    (repository.saveOportunidad as jest.Mock).mockResolvedValue(oportunidad());

    await crearOportunidad({ contactoId: 20 } as any, freelance, "corr-1");

    expect(repository.saveOportunidad).toHaveBeenCalledWith(
      expect.objectContaining({ etapaId: 1, responsableId: MI_GUID, contactoId: 20 }),
      { correlationId: "corr-1" },
    );
  });

  test("PipelineSinEtapaInicialError cuando el catálogo no tiene etapas activas", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({ id: "20" });
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue([]);

    await expect(
      crearOportunidad({ contactoId: 20 } as any, freelance, "corr-1"),
    ).rejects.toBeInstanceOf(PipelineSinEtapaInicialError);
    expect(repository.saveOportunidad).not.toHaveBeenCalled();
  });

  test("PipelineMonedaInvalidaError cuando la moneda no existe o está inactiva", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({ id: "20" });
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);
    (repository.findMonedaActiva as jest.Mock).mockResolvedValue(null);

    await expect(
      crearOportunidad(
        { contactoId: 20, montoEstimado: 100, monedaCodigo: "PEN" } as any,
        freelance,
        "corr-1",
      ),
    ).rejects.toBeInstanceOf(PipelineMonedaInvalidaError);
    expect(repository.saveOportunidad).not.toHaveBeenCalled();
  });

  test("PipelineMonedaInvalidaError cuando hay monto sin moneda", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({ id: "20" });
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);

    await expect(
      crearOportunidad(
        { contactoId: 20, montoEstimado: 100 } as any,
        freelance,
        "corr-1",
      ),
    ).rejects.toBeInstanceOf(PipelineMonedaInvalidaError);
  });

  test("crea con la moneda validada y el usuario autenticado como responsable", async () => {
    (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue({ id: "20" });
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);
    (repository.findMonedaActiva as jest.Mock).mockResolvedValue({ monedaCodigo: "PEN" });
    (repository.saveOportunidad as jest.Mock).mockResolvedValue(oportunidad());

    const res = await crearOportunidad(
      { contactoId: 20, montoEstimado: 200000, monedaCodigo: "PEN" } as any,
      freelance,
      "corr-1",
    );

    expect(repository.saveOportunidad).toHaveBeenCalledWith(
      expect.objectContaining({
        contactoId: 20,
        montoEstimado: 200000,
        monedaCodigo: "PEN",
        responsableId: MI_GUID,
        creadoNombre: freelance.name,
      }),
      { correlationId: "corr-1" },
    );
    expect(res?.oportunidadId).toBe(7);
  });
});

describe("pipeline.service -> obtenerOportunidad (ownership)", () => {
  test("null cuando no existe", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(null);

    expect(await obtenerOportunidad(7, freelance)).toBeNull();
  });

  test("null cuando existe pero es de otro y el rol no ve cartera ajena", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ responsableId: OTRO_GUID }),
    );

    expect(await obtenerOportunidad(7, freelance)).toBeNull();
  });

  test("devuelve la oportunidad propia comparando el GUID sin distinguir mayúsculas", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ responsableId: MI_GUID.toUpperCase() }),
    );

    const res = await obtenerOportunidad(7, freelance);

    expect(res?.oportunidadId).toBe(7);
  });

  test("dirección comercial puede leer una oportunidad ajena", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ responsableId: OTRO_GUID }),
    );

    const res = await obtenerOportunidad(7, direccion);

    expect(res?.oportunidadId).toBe(7);
  });

  test("null cuando el id no es un entero", async () => {
    expect(await obtenerOportunidad("abc" as any, freelance)).toBeNull();
    expect(repository.findOportunidadById).not.toHaveBeenCalled();
  });
});

describe("pipeline.service -> avanzarEtapa", () => {
  const input = { etapaDestinoCodigo: "CONTACTADO" } as any;

  test("null cuando no existe o no es visible", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(null);

    expect(await avanzarEtapa(7, input, freelance, "corr-1")).toBeNull();
    expect(repository.actualizarEtapa).not.toHaveBeenCalled();
  });

  test("PipelineOportunidadCerradaError cuando la oportunidad ya está GANADA o PERDIDA", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ estado: "PERDIDA" }),
    );

    await expect(avanzarEtapa(7, input, freelance, "corr-1")).rejects.toBeInstanceOf(
      PipelineOportunidadCerradaError,
    );
  });

  test("PipelineEtapaNoSecuencialError cuando el destino no es la etapa siguiente", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(oportunidad());
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);

    await expect(
      avanzarEtapa(7, { etapaDestinoCodigo: "CERRADO_GANADO" } as any, freelance, "corr-1"),
    ).rejects.toBeInstanceOf(PipelineEtapaNoSecuencialError);
    expect(repository.actualizarEtapa).not.toHaveBeenCalled();
  });

  test("PipelineEtapaNoSecuencialError cuando el código de destino no existe", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(oportunidad());
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);

    await expect(
      avanzarEtapa(7, { etapaDestinoCodigo: "INVENTADA" } as any, freelance, "corr-1"),
    ).rejects.toBeInstanceOf(PipelineEtapaNoSecuencialError);
  });

  test("PipelineCierreNoHabilitadoError cuando la etapa de cierre llega sin KYC validado", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ etapa: etapas[1], etapaId: 2 }),
    );
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue([
      etapas[1],
      etapas[2],
    ]);
    (repository.existeKycValidado as jest.Mock).mockResolvedValue(false);
    (repository.existeCierreRegistrado as jest.Mock).mockResolvedValue(true);

    await expect(
      avanzarEtapa(7, { etapaDestinoCodigo: "CERRADO_GANADO" } as any, freelance, "corr-1"),
    ).rejects.toBeInstanceOf(PipelineCierreNoHabilitadoError);
    expect(repository.actualizarEtapa).not.toHaveBeenCalled();
  });

  test("PipelineCierreNoHabilitadoError cuando hay KYC validado pero no cierre registrado", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ etapa: etapas[1] }),
    );
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue([etapas[1], etapas[2]]);
    (repository.existeKycValidado as jest.Mock).mockResolvedValue(true);
    (repository.existeCierreRegistrado as jest.Mock).mockResolvedValue(false);

    await expect(
      avanzarEtapa(7, { etapaDestinoCodigo: "CERRADO_GANADO" } as any, freelance, "corr-1"),
    ).rejects.toBeInstanceOf(PipelineCierreNoHabilitadoError);
  });

  test("al entrar a la etapa de cierre pasa a GANADA con fecha de resultado", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ etapa: etapas[1] }),
    );
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue([etapas[1], etapas[2]]);
    (repository.existeKycValidado as jest.Mock).mockResolvedValue(true);
    (repository.existeCierreRegistrado as jest.Mock).mockResolvedValue(true);
    (repository.actualizarEtapa as jest.Mock).mockResolvedValue(
      oportunidad({ estado: "GANADA", etapa: etapas[2] }),
    );

    await avanzarEtapa(
      7,
      { etapaDestinoCodigo: "CERRADO_GANADO", observacion: "Firma" } as any,
      freelance,
      "corr-1",
    );

    expect(repository.actualizarEtapa).toHaveBeenCalledWith(
      7,
      8,
      2,
      expect.objectContaining({
        estado: "GANADA",
        fechaResultado: expect.any(Date),
        observacion: "Firma",
        correlationId: "corr-1",
        usuarioId: MI_GUID,
      }),
    );
  });

  test("un avance intermedio no cierra la oportunidad ni consulta KYC/cierre", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(oportunidad());
    (repository.findEtapasActivas as jest.Mock).mockResolvedValue(etapas);
    (repository.actualizarEtapa as jest.Mock).mockResolvedValue(oportunidad({ etapa: etapas[1] }));

    await avanzarEtapa(7, input, freelance, "corr-1");

    expect(repository.existeKycValidado).not.toHaveBeenCalled();
    expect(repository.existeCierreRegistrado).not.toHaveBeenCalled();
    expect(repository.actualizarEtapa).toHaveBeenCalledWith(
      7,
      2,
      1,
      expect.objectContaining({ estado: "ACTIVA", fechaResultado: null }),
    );
  });
});

describe("pipeline.service -> marcarPerdida", () => {
  test("null cuando no existe o no es visible", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ responsableId: OTRO_GUID }),
    );

    expect(await marcarPerdida(7, { motivo: "Sin presupuesto" } as any, freelance)).toBeNull();
    expect(repository.marcarPerdida).not.toHaveBeenCalled();
  });

  test("PipelineOportunidadCerradaError cuando ya está cerrada", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ estado: "GANADA" }),
    );

    await expect(
      marcarPerdida(7, { motivo: "Sin presupuesto" } as any, freelance),
    ).rejects.toBeInstanceOf(PipelineOportunidadCerradaError);
  });

  test("delega el motivo en el repositorio", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(oportunidad());
    (repository.marcarPerdida as jest.Mock).mockResolvedValue(
      oportunidad({ estado: "PERDIDA", motivoPerdida: "Sin presupuesto" }),
    );

    const res = await marcarPerdida(
      7,
      { motivo: "Sin presupuesto" } as any,
      freelance,
    );

    expect(repository.marcarPerdida).toHaveBeenCalledWith(7, "Sin presupuesto", {
      usuarioId: MI_GUID,
      usuarioNombre: freelance.name,
    });
    expect(res?.estado).toBe("PERDIDA");
  });
});

describe("pipeline.service -> obtenerHistorial", () => {
  test("null cuando no es visible", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(
      oportunidad({ responsableId: OTRO_GUID }),
    );

    expect(await obtenerHistorial(7, freelance)).toBeNull();
    expect(repository.findHistorialByOportunidad).not.toHaveBeenCalled();
  });

  test("devuelve los hitos cuando es visible", async () => {
    (repository.findOportunidadById as jest.Mock).mockResolvedValue(oportunidad());
    (repository.findHistorialByOportunidad as jest.Mock).mockResolvedValue([{ historialId: 1 }]);

    const res = await obtenerHistorial(7, freelance);

    expect(res).toEqual([{ historialId: 1 }]);
    expect(repository.findHistorialByOportunidad).toHaveBeenCalledWith(7);
  });
});
