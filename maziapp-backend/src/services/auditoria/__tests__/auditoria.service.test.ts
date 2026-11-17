jest.mock("../../../config/sql", () => ({
  getPool: jest.fn(async () => ({ __pool: true })),
}));

jest.mock("../../../repositories/auditoria/auditoria.repository", () => ({
  findEventos: jest.fn(),
  findEventoById: jest.fn(),
  registrarEvento: jest.fn(),
}));

import * as repository from "../../../repositories/auditoria/auditoria.repository";
import {
  conAuditoriaDeRechazo,
  listarEventos,
  obtenerEvento,
} from "../auditoria.service";

class ReglaDeNegocioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReglaDeNegocioError";
  }
}

describe("auditoria.service (S40)", () => {
  test("listarEventos envuelve la página con page, pageSize y total", async () => {
    (repository.findEventos as jest.Mock).mockResolvedValue({
      items: [{ eventoId: "1" }],
      total: 1,
    });

    const res = await listarEventos({ page: 1, pageSize: 20 });

    expect(res).toEqual({
      items: [{ eventoId: "1" }],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  test("obtenerEvento delega en findEventoById", async () => {
    (repository.findEventoById as jest.Mock).mockResolvedValue({ eventoId: "7" });

    expect(await obtenerEvento("7")).toEqual({ eventoId: "7" });
  });

  test("conAuditoriaDeRechazo registra RECHAZO y relanza el mismo error de negocio", async () => {
    await expect(
      conAuditoriaDeRechazo(
        {
          servicioCodigo: "S06",
          operacion: "AvanzarEtapa",
          entidad: "Oportunidad",
          entidadId: 7,
        },
        (err) => err instanceof ReglaDeNegocioError,
        async () => {
          throw new ReglaDeNegocioError("Etapa no secuencial");
        },
      ),
    ).rejects.toThrow("Etapa no secuencial");

    expect(repository.registrarEvento).toHaveBeenCalledTimes(1);
    expect(repository.registrarEvento).toHaveBeenCalledWith(
      { __pool: true },
      {
        servicioCodigo: "S06",
        operacion: "AvanzarEtapa",
        entidad: "Oportunidad",
        entidadId: 7,
        resultado: "RECHAZO",
        detalle: {
          motivo: "ReglaDeNegocioError",
          mensaje: "Etapa no secuencial",
        },
      },
    );
  });

  test("conAuditoriaDeRechazo no registra errores inesperados que no sean rechazo de negocio", async () => {
    await expect(
      conAuditoriaDeRechazo(
        {
          servicioCodigo: "S06",
          operacion: "AvanzarEtapa",
          entidad: "Oportunidad",
          entidadId: 7,
        },
        (err) => err instanceof ReglaDeNegocioError,
        async () => {
          throw new Error("Fallo de red SQL");
        },
      ),
    ).rejects.toThrow("Fallo de red SQL");

    expect(repository.registrarEvento).not.toHaveBeenCalled();
  });

  test("un fallo de la bitácora no enmascara el rechazo de negocio original", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    (repository.registrarEvento as jest.Mock).mockRejectedValueOnce(
      new Error("DB caída"),
    );

    await expect(
      conAuditoriaDeRechazo(
        {
          servicioCodigo: "S12",
          operacion: "DictaminarExpediente",
          entidad: "KycExpediente",
          entidadId: 3,
        },
        (err) => err instanceof ReglaDeNegocioError,
        async () => {
          throw new ReglaDeNegocioError("Faltan documentos obligatorios");
        },
      ),
    ).rejects.toBeInstanceOf(ReglaDeNegocioError);

    spy.mockRestore();
  });
});
