/**
 * Fase Direcciones -- tests de direccion.service.ts.
 *
 * Mismo patrón que representante.service.test.ts: se mockean los
 * módulos de los que depende el service (direccion.repository,
 * ubigeo.repository y contacto.service), nunca la base de datos
 * directamente. El objetivo de esta suite es probar reglas de
 * NEGOCIO (ownership, aplicación a NATURAL y JURIDICA, validación de
 * IdDistrito, anti-enumeración) -- la parametrización SQL en sí se
 * prueba en direccion.repository.test.ts / ubigeo.repository.test.ts.
 */
import * as repository from "../../../repositories/direcciones/direccion.repository";
import * as ubigeoRepository from "../../../repositories/ubigeo/ubigeo.repository";
import * as contactoService from "../../contactos/contacto.service";
import {
  listarDirecciones,
  crearDireccion,
  actualizarDireccion,
  desactivarDireccion,
  DireccionDistritoInvalidoError,
} from "../direccion.service";

jest.mock("../../../repositories/direcciones/direccion.repository");
jest.mock("../../../repositories/ubigeo/ubigeo.repository");
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

const distritoValido = {
  idDistrito: 1501,
  distrito: "MIRAFLORES",
  provincia: "LIMA",
  departamento: "LIMA",
};

const inputBase = {
  idDistrito: 1501,
  calle: "Av. Javier Prado Este",
  numero: "1234",
} as any;

describe("direccion.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ownership (reutiliza contacto.service.obtenerContactoPorId, sin restricción de tipo)", () => {
    test("listarDirecciones devuelve null cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await listarDirecciones("999", baseUser);

      expect(res).toBeNull();
      expect(repository.findDireccionesByContacto).not.toHaveBeenCalled();
    });

    test("listarDirecciones funciona para un contacto NATURAL (Direcciones no se limita a JURIDICA)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.findDireccionesByContacto as jest.Mock).mockResolvedValue([]);

      const res = await listarDirecciones("20", baseUser);

      expect(res).toEqual([]);
      expect(repository.findDireccionesByContacto).toHaveBeenCalledWith(20);
    });

    test("listarDirecciones funciona para un contacto JURIDICA", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
      (repository.findDireccionesByContacto as jest.Mock).mockResolvedValue([]);

      const res = await listarDirecciones("10", baseUser);

      expect(res).toEqual([]);
      expect(repository.findDireccionesByContacto).toHaveBeenCalledWith(10);
    });
  });

  describe("crearDireccion", () => {
    test("null cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await crearDireccion("999", inputBase, baseUser);

      expect(res).toBeNull();
      expect(ubigeoRepository.findDistritoById).not.toHaveBeenCalled();
      expect(repository.saveDireccion).not.toHaveBeenCalled();
    });

    test("DireccionDistritoInvalidoError cuando el idDistrito no existe/no está activo", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (ubigeoRepository.findDistritoById as jest.Mock).mockResolvedValue(null);

      await expect(crearDireccion("20", inputBase, baseUser)).rejects.toBeInstanceOf(
        DireccionDistritoInvalidoError,
      );
      expect(repository.saveDireccion).not.toHaveBeenCalled();
    });

    test("crea la dirección y re-lee la fila con su JOIN de ubigeo (respuesta refleja lo persistido)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (ubigeoRepository.findDistritoById as jest.Mock).mockResolvedValue(distritoValido);
      (repository.saveDireccion as jest.Mock).mockResolvedValue(1);
      (repository.findDireccionByIdYContacto as jest.Mock).mockResolvedValue({
        idDireccion: 1,
        idContacto: 20,
        idDistrito: 1501,
        distrito: "MIRAFLORES",
        provincia: "LIMA",
        departamento: "LIMA",
        calle: "Av. Javier Prado Este",
        numero: "1234",
        departamentoInterior: null,
        activo: true,
      });

      const res = await crearDireccion("20", inputBase, baseUser);

      expect(repository.saveDireccion).toHaveBeenCalledWith(
        expect.objectContaining({ idContacto: 20, idDistrito: 1501 }),
      );
      expect(res).toMatchObject({ idDireccion: 1, distrito: "MIRAFLORES" });
    });
  });

  describe("actualizarDireccion", () => {
    test("null cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await actualizarDireccion("999", "1", inputBase, baseUser);

      expect(res).toBeNull();
      expect(repository.updateDireccion).not.toHaveBeenCalled();
    });

    test("null cuando el direccionId no es un entero válido", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);

      const res = await actualizarDireccion("20", "no-es-numero", inputBase, baseUser);

      expect(res).toBeNull();
      expect(repository.updateDireccion).not.toHaveBeenCalled();
    });

    test("DireccionDistritoInvalidoError cuando el nuevo idDistrito no existe", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (ubigeoRepository.findDistritoById as jest.Mock).mockResolvedValue(null);

      await expect(actualizarDireccion("20", "1", inputBase, baseUser)).rejects.toBeInstanceOf(
        DireccionDistritoInvalidoError,
      );
    });

    test("null cuando la dirección no existe, no es de este contacto, o ya está desactivada (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (ubigeoRepository.findDistritoById as jest.Mock).mockResolvedValue(distritoValido);
      (repository.updateDireccion as jest.Mock).mockResolvedValue(false);

      const res = await actualizarDireccion("20", "999", inputBase, baseUser);

      expect(res).toBeNull();
    });

    test("actualiza y re-lee la fila con su JOIN de ubigeo", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (ubigeoRepository.findDistritoById as jest.Mock).mockResolvedValue(distritoValido);
      (repository.updateDireccion as jest.Mock).mockResolvedValue(true);
      (repository.findDireccionByIdYContacto as jest.Mock).mockResolvedValue({
        idDireccion: 1,
        distrito: "MIRAFLORES",
      });

      const res = await actualizarDireccion("20", "1", inputBase, baseUser);

      expect(res).toMatchObject({ idDireccion: 1, distrito: "MIRAFLORES" });
    });
  });

  describe("desactivarDireccion", () => {
    test("null cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await desactivarDireccion("999", "1", baseUser);

      expect(res).toBeNull();
      expect(repository.desactivarDireccion).not.toHaveBeenCalled();
    });

    test("null cuando la dirección no existe, no es de este contacto, o ya está desactivada", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.desactivarDireccion as jest.Mock).mockResolvedValue(false);

      const res = await desactivarDireccion("20", "999", baseUser);

      expect(res).toBeNull();
    });

    test("true cuando la desactivación es exitosa", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.desactivarDireccion as jest.Mock).mockResolvedValue(true);

      const res = await desactivarDireccion("20", "1", baseUser);

      expect(res).toBe(true);
    });
  });
});
