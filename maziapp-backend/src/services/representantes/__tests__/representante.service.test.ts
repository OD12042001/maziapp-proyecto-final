/**
 * Fase Representantes — tests de representante.service.ts.
 *
 * Mismo patrón que contacto.service.test.ts: se mockean los módulos de
 * los que depende el service (representante.repository y
 * contacto.service), nunca la base de datos directamente. El objetivo
 * de esta suite es probar reglas de NEGOCIO (ownership, JURIDICA vs
 * NATURAL, reutilizar vs crear, duplicado vs reactivar) — la
 * parametrización SQL en sí se prueba en representante.repository.test.ts.
 */
import * as repository from "../../../repositories/representantes/representante.repository";
import * as contactoService from "../../contactos/contacto.service";
import {
  listarRepresentantes,
  crearRepresentante,
  actualizarRepresentante,
  desactivarRepresentante,
  RepresentanteContactoNoJuridicaError,
  RepresentanteRelacionDuplicadaError,
} from "../representante.service";

jest.mock("../../../repositories/representantes/representante.repository");
jest.mock("../../contactos/contacto.service");

const baseUser = {
  oid: "user-1",
  name: "Test",
  preferred_username: "test@example.com",
  roles: ["ejecutivo_inversion"],
} as any;

const contactoJuridica = {
  id: "10",
  pid: 10,
  tipoContacto: "JURIDICA",
  responsableId: "user-1",
};

const contactoNatural = {
  id: "20",
  pid: 20,
  tipoContacto: "NATURAL",
  responsableId: "user-1",
};

const inputBase = {
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombres: "Juan",
  apellidos: "Pérez",
  cargo: "Gerente General",
  celular: "999888777",
  correo: "juan@example.com",
};

describe("representante.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ownership (reutiliza contacto.service.obtenerContactoPorId)", () => {
    test("contacto inexistente o ajeno -> null (anti-enumeración, 404 en la Function), no llama al repository de representantes", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await listarRepresentantes("10", baseUser);

      expect(res).toBeNull();
      expect(repository.findRepresentantesByContacto).not.toHaveBeenCalled();
    });

    test("contacto del usuario correcto -> continúa la operación", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentantesByContacto as jest.Mock).mockResolvedValue([]);

      const res = await listarRepresentantes("10", baseUser);

      expect(res).toEqual([]);
      expect(contactoService.obtenerContactoPorId).toHaveBeenCalledWith(
        "10",
        baseUser,
      );
    });
  });

  describe("NATURAL vs JURIDICA", () => {
    test("contacto NATURAL -> RepresentanteContactoNoJuridicaError, sin llamar al repository de representantes", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoNatural,
      );

      await expect(listarRepresentantes("20", baseUser)).rejects.toBeInstanceOf(
        RepresentanteContactoNoJuridicaError,
      );

      expect(repository.findRepresentantesByContacto).not.toHaveBeenCalled();
    });

    test("contacto JURIDICA -> aceptado, se ejecuta la operación", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue(null);
      (repository.saveRepresentante as jest.Mock).mockResolvedValue({
        representanteId: "1",
        ...inputBase,
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);
      (repository.saveRelacion as jest.Mock).mockResolvedValue(100);

      const res = await crearRepresentante("10", inputBase as any, baseUser);

      expect(res).not.toBeNull();
      expect(repository.saveRelacion).toHaveBeenCalled();
    });
  });

  describe("crearRepresentante — reutilizar vs crear la persona", () => {
    test("representante existente por documento -> se REUTILIZA, no se llama a saveRepresentante, y los datos personales devueltos vienen del registro existente (no del input)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue({
        representanteId: "5",
        tipoDocumento: "DNI",
        numeroDocumento: "12345678",
        nombres: "Juan Registrado",
        apellidos: "Pérez Registrado",
        celular: "111111111",
        correo: "registrado@example.com",
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);
      (repository.saveRelacion as jest.Mock).mockResolvedValue(200);

      const res = await crearRepresentante(
        "10",
        {
          ...inputBase,
          // El input de ESTA llamada trae datos distintos a los ya
          // registrados -- no deben pisar el registro global.
          nombres: "Juan Nuevo",
          apellidos: "Pérez Nuevo",
          celular: "999888777",
          correo: "nuevo@example.com",
        } as any,
        baseUser,
      );

      expect(repository.saveRepresentante).not.toHaveBeenCalled();
      expect(res).toMatchObject({
        representanteId: "5",
        nombres: "Juan Registrado",
        apellidos: "Pérez Registrado",
        celular: "111111111",
        correo: "registrado@example.com",
      });
      // Cargo SÍ viene del input de esta llamada (vive en la relación,
      // no en la persona).
      expect(res).toMatchObject({ cargo: inputBase.cargo });
    });

    test("representante nuevo (documento no encontrado) -> se llama a saveRepresentante", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue(null);
      (repository.saveRepresentante as jest.Mock).mockResolvedValue({
        representanteId: "7",
        tipoDocumento: inputBase.tipoDocumento,
        numeroDocumento: inputBase.numeroDocumento,
        nombres: inputBase.nombres,
        apellidos: inputBase.apellidos,
        celular: inputBase.celular,
        correo: inputBase.correo,
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);
      (repository.saveRelacion as jest.Mock).mockResolvedValue(300);

      const res = await crearRepresentante("10", inputBase as any, baseUser);

      expect(repository.saveRepresentante).toHaveBeenCalledWith(
        expect.objectContaining({
          tipoDocumento: inputBase.tipoDocumento,
          numeroDocumento: inputBase.numeroDocumento,
          nombres: inputBase.nombres,
          apellidos: inputBase.apellidos,
          creadoId: baseUser.oid,
        }),
      );
      expect(res).toMatchObject({ representanteId: "7" });
    });

    test("un representante puede quedar asociado a varias empresas (RepresentanteId reutilizado, dos llamadas con distinto contactoId)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock)
        .mockResolvedValueOnce(contactoJuridica)
        .mockResolvedValueOnce({ ...contactoJuridica, id: "11", pid: 11 });
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue({
        representanteId: "5",
        ...inputBase,
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);
      (repository.saveRelacion as jest.Mock)
        .mockResolvedValueOnce(400)
        .mockResolvedValueOnce(401);

      await crearRepresentante("10", inputBase as any, baseUser);
      await crearRepresentante("11", inputBase as any, baseUser);

      expect(repository.saveRepresentante).not.toHaveBeenCalled();
      expect(repository.saveRelacion).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ contactoId: 10, representanteId: 5 }),
      );
      expect(repository.saveRelacion).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ contactoId: 11, representanteId: 5 }),
      );
    });

    test("una empresa puede tener varios representantes (dos documentos distintos, misma empresa)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock)
        .mockResolvedValueOnce({ representanteId: "5", ...inputBase })
        .mockResolvedValueOnce({
          representanteId: "6",
          tipoDocumento: "CE",
          numeroDocumento: "000111222",
          nombres: "Ana",
          apellidos: "Gómez",
          celular: null,
          correo: null,
        });
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);
      (repository.saveRelacion as jest.Mock)
        .mockResolvedValueOnce(500)
        .mockResolvedValueOnce(501);

      await crearRepresentante("10", inputBase as any, baseUser);
      await crearRepresentante(
        "10",
        { ...inputBase, tipoDocumento: "CE", numeroDocumento: "000111222", cargo: "Apoderado" } as any,
        baseUser,
      );

      expect(repository.saveRelacion).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ contactoId: 10, representanteId: 5 }),
      );
      expect(repository.saveRelacion).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ contactoId: 10, representanteId: 6 }),
      );
    });
  });

  describe("crearRepresentante — relación duplicada vs reactivación", () => {
    test("relación YA ACTIVA -> RepresentanteRelacionDuplicadaError (409 en la Function), no llama a saveRelacion ni a reactivarRelacion", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue({
        representanteId: "5",
        ...inputBase,
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: true,
      });

      await expect(
        crearRepresentante("10", inputBase as any, baseUser),
      ).rejects.toBeInstanceOf(RepresentanteRelacionDuplicadaError);

      expect(repository.saveRelacion).not.toHaveBeenCalled();
      expect(repository.reactivarRelacion).not.toHaveBeenCalled();
    });

    test("relación existente pero INACTIVA -> se REACTIVA (no crea una fila nueva)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRepresentanteByDocumento as jest.Mock).mockResolvedValue({
        representanteId: "5",
        ...inputBase,
      });
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: false,
      });

      const res = await crearRepresentante("10", inputBase as any, baseUser);

      expect(repository.reactivarRelacion).toHaveBeenCalledWith(
        900,
        inputBase.cargo,
        baseUser.oid,
      );
      expect(repository.saveRelacion).not.toHaveBeenCalled();
      expect(res).toMatchObject({ contactoRepresentanteId: "900" });
    });
  });

  /**
   * Fase Representantes (Edición) — actualizarRepresentante. Mismo
   * criterio de las secciones anteriores: solo reglas de negocio
   * (ownership, JURIDICA, pertenencia de la relación, orden de las
   * dos actualizaciones) — la parametrización SQL en sí se prueba en
   * representante.repository.test.ts.
   */
  describe("actualizarRepresentante", () => {
    const updateInput = {
      nombres: "Juan Actualizado",
      apellidos: "Pérez Actualizado",
      cargo: "Gerente de Finanzas",
      celular: "999888777",
      correo: "juan.actualizado@example.com",
    };

    test("ownership incorrecto -> null, no llama al repository", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await actualizarRepresentante("10", "5", updateInput as any, baseUser);

      expect(res).toBeNull();
      expect(repository.updateRepresentante).not.toHaveBeenCalled();
      expect(repository.updateCargoRelacion).not.toHaveBeenCalled();
    });

    test("contacto NATURAL -> RepresentanteContactoNoJuridicaError", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoNatural,
      );

      await expect(
        actualizarRepresentante("20", "5", updateInput as any, baseUser),
      ).rejects.toBeInstanceOf(RepresentanteContactoNoJuridicaError);

      expect(repository.updateRepresentante).not.toHaveBeenCalled();
    });

    test("representanteId no numérico -> null, sin llamar al repository de relación", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );

      const res = await actualizarRepresentante("10", "abc", updateInput as any, baseUser);

      expect(res).toBeNull();
      expect(repository.findRelacion).not.toHaveBeenCalled();
    });

    test("relación no existe entre ESTA empresa y este representante -> null (404, anti-enumeración), no toca ninguna tabla", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);

      const res = await actualizarRepresentante("10", "5", updateInput as any, baseUser);

      expect(res).toBeNull();
      expect(repository.updateRepresentante).not.toHaveBeenCalled();
      expect(repository.updateCargoRelacion).not.toHaveBeenCalled();
    });

    test("relación existe pero está INACTIVA -> null, no toca ninguna tabla", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: false,
      });

      const res = await actualizarRepresentante("10", "5", updateInput as any, baseUser);

      expect(res).toBeNull();
      expect(repository.updateRepresentante).not.toHaveBeenCalled();
      expect(repository.updateCargoRelacion).not.toHaveBeenCalled();
    });

    test("edición exitosa: actualiza dbo.Representantes y el Cargo de LA RELACIÓN de esta empresa, luego devuelve el registro fresco", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: true,
      });
      (repository.updateCargoRelacion as jest.Mock).mockResolvedValue(true);
      (repository.findContactoRepresentantePorId as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: "900",
        representanteId: "5",
        tipoDocumento: "DNI",
        numeroDocumento: "12345678",
        nombres: updateInput.nombres,
        apellidos: updateInput.apellidos,
        cargo: updateInput.cargo,
        celular: updateInput.celular,
        correo: updateInput.correo,
      });

      const res = await actualizarRepresentante("10", "5", updateInput as any, baseUser);

      expect(repository.updateRepresentante).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          nombres: updateInput.nombres,
          apellidos: updateInput.apellidos,
          celular: updateInput.celular,
          correo: updateInput.correo,
          actualizadoId: baseUser.oid,
        }),
      );
      expect(repository.updateCargoRelacion).toHaveBeenCalledWith(
        900,
        updateInput.cargo,
        baseUser.oid,
      );
      expect(repository.findContactoRepresentantePorId).toHaveBeenCalledWith(900);
      expect(res).toMatchObject({ contactoRepresentanteId: "900", cargo: updateInput.cargo });
    });

    test("carrera con desactivación concurrente: updateCargoRelacion devuelve false -> null (404), no lanza excepción", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: true,
      });
      (repository.updateCargoRelacion as jest.Mock).mockResolvedValue(false);

      const res = await actualizarRepresentante("10", "5", updateInput as any, baseUser);

      expect(res).toBeNull();
      expect(repository.findContactoRepresentantePorId).not.toHaveBeenCalled();
    });

    // 🔐 CRÍTICO (restricción explícita del usuario, ver
    // representante.service.ts): editar un representante de UNA
    // empresa nunca debe tocar la relación de OTRA empresa con ese
    // mismo representante -- solo se llama a updateCargoRelacion con
    // el contactoRepresentanteId de LA RELACIÓN resuelta para el
    // contactoId de ESTA llamada.
    test("un representante en varias empresas: editar desde la empresa A solo actualiza la relación de A, y editar desde B solo la de B (nunca se cruzan)", async () => {
      // 🐛 Nota de esta corrección: la versión anterior de este test
      // encolaba dos `mockResolvedValueOnce` por mock pero solo
      // invocaba `actualizarRepresentante` una vez -- el segundo valor
      // encolado quedaba pendiente (jest.clearAllMocks()/`clearMocks`
      // del jest.config no vacía la cola de `mockResolvedValueOnce`,
      // solo `mockReset()` lo hace) y se filtraba hacia el SIGUIENTE
      // test ejecutado (`desactivarRepresentante › ownership
      // incorrecto`), hacién dolo fallar con un contacto/relación que
      // nunca configuró. Ahora se invoca la función una vez POR cada
      // valor encolado -- consume ambos, no deja nada pendiente, y de
      // paso verifica el comportamiento real con dos empresas distintas.
      (contactoService.obtenerContactoPorId as jest.Mock)
        .mockResolvedValueOnce(contactoJuridica) // empresa A (pid 10)
        .mockResolvedValueOnce({ ...contactoJuridica, id: "11", pid: 11 }); // empresa B
      (repository.findRelacion as jest.Mock)
        .mockResolvedValueOnce({ contactoRepresentanteId: 900, activo: true }) // relación A
        .mockResolvedValueOnce({ contactoRepresentanteId: 901, activo: true }); // relación B
      (repository.updateCargoRelacion as jest.Mock).mockResolvedValue(true);
      (repository.findContactoRepresentantePorId as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: "900",
        representanteId: "5",
        tipoDocumento: "DNI",
        numeroDocumento: "12345678",
        nombres: updateInput.nombres,
        apellidos: updateInput.apellidos,
        cargo: updateInput.cargo,
        celular: updateInput.celular,
        correo: updateInput.correo,
      });

      await actualizarRepresentante("10", "5", updateInput as any, baseUser); // empresa A
      await actualizarRepresentante("11", "5", updateInput as any, baseUser); // empresa B

      expect(repository.updateCargoRelacion).toHaveBeenCalledTimes(2);
      expect(repository.updateCargoRelacion).toHaveBeenNthCalledWith(
        1,
        900,
        updateInput.cargo,
        baseUser.oid,
      );
      expect(repository.updateCargoRelacion).toHaveBeenNthCalledWith(
        2,
        901,
        updateInput.cargo,
        baseUser.oid,
      );
      // dbo.Representantes se actualiza una vez POR llamada (registro
      // global compartido, se actualiza igual sin importar desde qué
      // empresa se edite) -- lo que nunca se cruza es
      // updateCargoRelacion, verificado arriba (900 vs 901, nunca
      // mezclados).
      expect(repository.updateRepresentante).toHaveBeenCalledTimes(2);
    });
  });

  describe("desactivarRepresentante", () => {
    test("ownership incorrecto -> null, no llama al repository", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await desactivarRepresentante("10", "5", baseUser);

      expect(res).toBeNull();
      expect(repository.desactivarRelacion).not.toHaveBeenCalled();
    });

    test("contacto NATURAL -> RepresentanteContactoNoJuridicaError", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoNatural,
      );

      await expect(
        desactivarRepresentante("20", "5", baseUser),
      ).rejects.toBeInstanceOf(RepresentanteContactoNoJuridicaError);
    });

    test("relación no existe -> null (404 en la Function), no llama a desactivarRelacion", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue(null);

      const res = await desactivarRepresentante("10", "5", baseUser);

      expect(res).toBeNull();
      expect(repository.desactivarRelacion).not.toHaveBeenCalled();
    });

    test("relación ya inactiva -> null, no vuelve a llamar a desactivarRelacion", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: false,
      });

      const res = await desactivarRepresentante("10", "5", baseUser);

      expect(res).toBeNull();
      expect(repository.desactivarRelacion).not.toHaveBeenCalled();
    });

    test("desactivación correcta: relación activa -> desactivarRelacion llamado con el id de la relación y el oid del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );
      (repository.findRelacion as jest.Mock).mockResolvedValue({
        contactoRepresentanteId: 900,
        activo: true,
      });
      (repository.desactivarRelacion as jest.Mock).mockResolvedValue(true);

      const res = await desactivarRepresentante("10", "5", baseUser);

      expect(res).toBe(true);
      expect(repository.desactivarRelacion).toHaveBeenCalledWith(900, baseUser.oid);
    });

    test("representanteId no numérico -> null, sin llamar al repository de relación", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(
        contactoJuridica,
      );

      const res = await desactivarRepresentante("10", "abc", baseUser);

      expect(res).toBeNull();
      expect(repository.findRelacion).not.toHaveBeenCalled();
    });
  });
});
