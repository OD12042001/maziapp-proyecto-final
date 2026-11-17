jest.mock(
  "../../../repositories/idempotencia/idempotencia.repository",
  () => ({
    reservar: jest.fn(),
    findByClave: jest.fn(),
    completar: jest.fn(),
    liberar: jest.fn(),
  }),
);

import * as repository from "../../../repositories/idempotencia/idempotencia.repository";
import {
  ejecutarIdempotente,
  hashDeCuerpo,
  IdempotenciaClaveInvalidaError,
  IdempotenciaCuerpoDistintoError,
  IdempotenciaEnProcesoError,
  validarClave,
} from "../idempotencia.service";

const GUID = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("idempotencia.service (ESB lógico)", () => {
  test("validarClave exige entre 8 y 100 caracteres permitidos", () => {
    expect(validarClave("  clave-valida_01:ok  ")).toBe("clave-valida_01:ok");
    expect(() => validarClave("corta")).toThrow(IdempotenciaClaveInvalidaError);
    expect(() => validarClave("con espacios invalidos")).toThrow(
      IdempotenciaClaveInvalidaError,
    );
  });

  test("hashDeCuerpo es determinista con independencia del orden de claves", () => {
    const h1 = hashDeCuerpo({ b: 2, a: 1, nested: { z: true, y: false } });
    const h2 = hashDeCuerpo({ a: 1, nested: { y: false, z: true }, b: 2 });
    const h3 = hashDeCuerpo({ a: 1, b: 999 });

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toHaveLength(64);
  });

  test("primera ejecución reserva, ejecuta y persiste la respuesta exitosa", async () => {
    (repository.reservar as jest.Mock).mockResolvedValue(true);
    (repository.completar as jest.Mock).mockResolvedValue(true);

    const res = await ejecutarIdempotente(
      {
        clave: "idem-0001",
        endpoint: "POST /cierres",
        usuarioId: GUID,
        cuerpo: { oportunidadId: 7, monto: 1000 },
      },
      async () => ({ status: 201, body: { cierreId: 5 } }),
    );

    expect(res).toEqual({
      status: 201,
      body: { cierreId: 5 },
      reutilizada: false,
    });
    expect(repository.completar).toHaveBeenCalledWith(
      "idem-0001",
      201,
      JSON.stringify({ cierreId: 5 }),
    );
  });

  test("repetición con mismo cuerpo devuelve la respuesta guardada sin reejecutar", async () => {
    const cuerpo = { oportunidadId: 7, monto: 1000 };
    (repository.reservar as jest.Mock).mockResolvedValue(false);
    (repository.findByClave as jest.Mock).mockResolvedValue({
      clave: "idem-0001",
      endpoint: "POST /cierres",
      usuarioId: GUID,
      hashSolicitud: hashDeCuerpo(cuerpo),
      estado: "COMPLETADA",
      codigoRespuesta: 201,
      cuerpoRespuesta: JSON.stringify({ cierreId: 5 }),
    });

    const operacion = jest.fn();

    const res = await ejecutarIdempotente(
      {
        clave: "idem-0001",
        endpoint: "POST /cierres",
        usuarioId: GUID,
        cuerpo,
      },
      operacion,
    );

    expect(operacion).not.toHaveBeenCalled();
    expect(res).toEqual({
      status: 201,
      body: { cierreId: 5 },
      reutilizada: true,
    });
  });

  test("repetición con cuerpo distinto lanza IdempotenciaCuerpoDistintoError (422)", async () => {
    (repository.reservar as jest.Mock).mockResolvedValue(false);
    (repository.findByClave as jest.Mock).mockResolvedValue({
      clave: "idem-0001",
      endpoint: "POST /cierres",
      usuarioId: GUID,
      hashSolicitud: hashDeCuerpo({ oportunidadId: 7, monto: 1000 }),
      estado: "COMPLETADA",
      codigoRespuesta: 201,
      cuerpoRespuesta: '{"cierreId":5}',
    });

    await expect(
      ejecutarIdempotente(
        {
          clave: "idem-0001",
          endpoint: "POST /cierres",
          usuarioId: GUID,
          cuerpo: { oportunidadId: 7, monto: 9999 },
        },
        async () => ({ status: 201, body: {} }),
      ),
    ).rejects.toBeInstanceOf(IdempotenciaCuerpoDistintoError);
  });

  test("repetición mientras la primera sigue EN_PROCESO lanza IdempotenciaEnProcesoError (409)", async () => {
    const cuerpo = { oportunidadId: 7 };
    (repository.reservar as jest.Mock).mockResolvedValue(false);
    (repository.findByClave as jest.Mock).mockResolvedValue({
      clave: "idem-0001",
      endpoint: "POST /cierres",
      usuarioId: GUID,
      hashSolicitud: hashDeCuerpo(cuerpo),
      estado: "EN_PROCESO",
      codigoRespuesta: null,
      cuerpoRespuesta: null,
    });

    await expect(
      ejecutarIdempotente(
        {
          clave: "idem-0001",
          endpoint: "POST /cierres",
          usuarioId: GUID,
          cuerpo,
        },
        async () => ({ status: 201, body: {} }),
      ),
    ).rejects.toBeInstanceOf(IdempotenciaEnProcesoError);
  });

  test("libera la reserva cuando la operación falla o devuelve >= 400", async () => {
    (repository.reservar as jest.Mock).mockResolvedValue(true);

    const res409 = await ejecutarIdempotente(
      {
        clave: "idem-0002",
        endpoint: "POST /cierres",
        usuarioId: GUID,
        cuerpo: { oportunidadId: 7 },
      },
      async () => ({ status: 409, body: { message: "Conflicto" } }),
    );

    expect(res409.status).toBe(409);
    expect(repository.liberar).toHaveBeenCalledWith("idem-0002");
    expect(repository.completar).not.toHaveBeenCalled();

    (repository.liberar as jest.Mock).mockClear();
    await expect(
      ejecutarIdempotente(
        {
          clave: "idem-0003",
          endpoint: "POST /cierres",
          usuarioId: GUID,
          cuerpo: { oportunidadId: 7 },
        },
        async () => {
          throw new Error("Boom");
        },
      ),
    ).rejects.toThrow("Boom");
    expect(repository.liberar).toHaveBeenCalledWith("idem-0003");
  });
});
