/**
 * Fase Trabajos Dependientes (arquitectura independiente, patrón
 * Direcciones) -- tests de trabajoDependiente.service.ts.
 *
 * Mismo patrón que direccion.service.test.ts: se mockean los módulos
 * de los que depende el service (trabajoDependiente.repository,
 * empresaBusqueda.repository y contacto.service), nunca la base de
 * datos directamente. El objetivo de esta suite es probar reglas de
 * NEGOCIO (ownership, restricción a NATURAL, validación de
 * empresaContactoId, anti-enumeración) -- la parametrización SQL en sí
 * se prueba en trabajoDependiente.repository.test.ts.
 */
import * as repository from "../../../repositories/trabajosDependientes/trabajoDependiente.repository";
import * as empresaBusquedaRepository from "../../../repositories/contactos/empresaBusqueda.repository";
import * as contactoService from "../../contactos/contacto.service";
import {
  listarTrabajosDependientes,
  crearTrabajoDependiente,
  actualizarTrabajoDependiente,
  desactivarTrabajoDependiente,
  TrabajoDependienteTipoIncorrectoError,
  TrabajoDependienteEmpresaInvalidaError,
} from "../trabajoDependiente.service";

jest.mock("../../../repositories/trabajosDependientes/trabajoDependiente.repository");
jest.mock("../../../repositories/contactos/empresaBusqueda.repository");
jest.mock("../../contactos/contacto.service");

const baseUser = {
  oid: "user-1",
  name: "Test",
  preferred_username: "test@example.com",
  roles: ["ejecutivo_inversion"],
} as any;

const contactoNatural = {
  id: "20",
  pid: 20,
  tipoContacto: "NATURAL",
  responsableId: "user-1",
};

const contactoJuridica = {
  id: "10",
  pid: 10,
  tipoContacto: "JURIDICA",
  responsableId: "user-1",
};

const inputConEmpresaLibre = {
  empresaNombreLibre: "Empresa Libre S.A.",
  cargo: "Analista",
  desde: "2020-01-01",
} as any;

const inputConEmpresaContacto = {
  empresaContactoId: 30,
  cargo: "Analista",
  desde: "2020-01-01",
} as any;

const trabajoPersistido = {
  id: "1",
  contactoId: "20",
  empresa: { tipo: "LIBRE", contactoId: null, nombre: "Empresa Libre S.A." },
  cargo: "Analista",
  desde: "2020-01-01",
  hasta: null,
};

describe("trabajoDependiente.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ownership (reutiliza contacto.service.obtenerContactoPorId)", () => {
    test("listarTrabajosDependientes devuelve null cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await listarTrabajosDependientes("999", baseUser);

      expect(res).toBeNull();
      expect(repository.findTrabajosByContacto).not.toHaveBeenCalled();
    });

    test("listarTrabajosDependientes funciona para un contacto NATURAL", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.findTrabajosByContacto as jest.Mock).mockResolvedValue([]);

      const res = await listarTrabajosDependientes("20", baseUser);

      expect(res).toEqual([]);
      expect(repository.findTrabajosByContacto).toHaveBeenCalledWith(20);
    });
  });

  describe("crearTrabajoDependiente", () => {
    test("null cuando el contacto no existe o no es del usuario (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await crearTrabajoDependiente("999", inputConEmpresaLibre, baseUser);

      expect(res).toBeNull();
      expect(empresaBusquedaRepository.existeEmpresaAccesible).not.toHaveBeenCalled();
      expect(repository.saveTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("TrabajoDependienteTipoIncorrectoError cuando el contacto es JURIDICA", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);

      await expect(
        crearTrabajoDependiente("10", inputConEmpresaLibre, baseUser),
      ).rejects.toBeInstanceOf(TrabajoDependienteTipoIncorrectoError);
      expect(repository.saveTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("TrabajoDependienteEmpresaInvalidaError cuando empresaContactoId no es una empresa accesible", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (empresaBusquedaRepository.existeEmpresaAccesible as jest.Mock).mockResolvedValue(false);

      await expect(
        crearTrabajoDependiente("20", inputConEmpresaContacto, baseUser),
      ).rejects.toBeInstanceOf(TrabajoDependienteEmpresaInvalidaError);
      expect(repository.saveTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("no valida empresa cuando el trabajo usa empresaNombreLibre (texto libre)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.saveTrabajoDependiente as jest.Mock).mockResolvedValue(1);
      (repository.findTrabajoByIdYContacto as jest.Mock).mockResolvedValue(trabajoPersistido);

      const res = await crearTrabajoDependiente("20", inputConEmpresaLibre, baseUser);

      expect(empresaBusquedaRepository.existeEmpresaAccesible).not.toHaveBeenCalled();
      expect(res).toMatchObject({ id: "1", cargo: "Analista" });
    });

    test("crea el trabajo y re-lee la fila con su JOIN de Empresa (respuesta refleja lo persistido)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (empresaBusquedaRepository.existeEmpresaAccesible as jest.Mock).mockResolvedValue(true);
      (repository.saveTrabajoDependiente as jest.Mock).mockResolvedValue(1);
      (repository.findTrabajoByIdYContacto as jest.Mock).mockResolvedValue({
        id: "1",
        contactoId: "20",
        empresa: { tipo: "CONTACTO", contactoId: "30", nombre: "Empresa S.A." },
        cargo: "Analista",
        desde: "2020-01-01",
        hasta: null,
      });

      const res = await crearTrabajoDependiente("20", inputConEmpresaContacto, baseUser);

      expect(repository.saveTrabajoDependiente).toHaveBeenCalledWith(
        expect.objectContaining({ contactoId: 20, empresaContactoId: 30 }),
      );
      expect(res).toMatchObject({ id: "1", empresa: { tipo: "CONTACTO", nombre: "Empresa S.A." } });
    });
  });

  describe("actualizarTrabajoDependiente", () => {
    test("null cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await actualizarTrabajoDependiente("999", "1", inputConEmpresaLibre, baseUser);

      expect(res).toBeNull();
      expect(repository.updateTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("null cuando el trabajoId no es un entero válido", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);

      const res = await actualizarTrabajoDependiente(
        "20",
        "no-es-numero",
        inputConEmpresaLibre,
        baseUser,
      );

      expect(res).toBeNull();
      expect(repository.updateTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("TrabajoDependienteEmpresaInvalidaError cuando la nueva empresa no es accesible", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (empresaBusquedaRepository.existeEmpresaAccesible as jest.Mock).mockResolvedValue(false);

      await expect(
        actualizarTrabajoDependiente("20", "1", inputConEmpresaContacto, baseUser),
      ).rejects.toBeInstanceOf(TrabajoDependienteEmpresaInvalidaError);
    });

    test("null cuando el trabajo no existe, no es de este contacto, o ya está desactivado (anti-enumeración)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.updateTrabajoDependiente as jest.Mock).mockResolvedValue(false);

      const res = await actualizarTrabajoDependiente("20", "999", inputConEmpresaLibre, baseUser);

      expect(res).toBeNull();
    });

    test("actualiza y re-lee la fila con su JOIN de Empresa", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.updateTrabajoDependiente as jest.Mock).mockResolvedValue(true);
      (repository.findTrabajoByIdYContacto as jest.Mock).mockResolvedValue(trabajoPersistido);

      const res = await actualizarTrabajoDependiente("20", "1", inputConEmpresaLibre, baseUser);

      expect(res).toMatchObject({ id: "1", cargo: "Analista" });
    });
  });

  describe("desactivarTrabajoDependiente", () => {
    test("null cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await desactivarTrabajoDependiente("999", "1", baseUser);

      expect(res).toBeNull();
      expect(repository.desactivarTrabajoDependiente).not.toHaveBeenCalled();
    });

    test("null cuando el trabajo no existe, no es de este contacto, o ya está desactivado", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.desactivarTrabajoDependiente as jest.Mock).mockResolvedValue(false);

      const res = await desactivarTrabajoDependiente("20", "999", baseUser);

      expect(res).toBeNull();
    });

    test("true cuando la desactivación es exitosa", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.desactivarTrabajoDependiente as jest.Mock).mockResolvedValue(true);

      const res = await desactivarTrabajoDependiente("20", "1", baseUser);

      expect(res).toBe(true);
    });
  });
});
