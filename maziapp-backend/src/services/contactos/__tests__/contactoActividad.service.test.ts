/**
 * Fase Actividad -- contactoActividad.service.ts
 *
 * Mismo criterio que contacto.service.test.ts / direccion.service.test.ts:
 * mockea los repositories y contacto.service (para obtenerContactoPorId),
 * prueba reglas de negocio -- ownership (anti-enumeración), coherencia
 * NATURAL/JURIDICA contra el TipoContacto REAL (nunca el declarado por
 * el cliente), validación de CIIU antes de guardar.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): este service YA NO importa
 * empresaBusqueda.repository (por eso ya no se mockea aquí) ni expone
 * `ActividadEmpresaInvalidaError` -- ambos eran exclusivos de la
 * validación/inserción de `trabajosNuevos`, retirada por completo.
 * `obtenerActividad` ya no devuelve `trabajos`, y
 * `guardarActividadNatural`/`guardarActividadJuridica` ya no lo
 * reciben ni lo devuelven.
 */
import * as repository from "../../../repositories/contactos/contactoActividad.repository";
import * as ciiuRepository from "../../../repositories/ciiu/ciiu.repository";
import * as contactoService from "../contacto.service";
import {
  obtenerActividad,
  guardarActividadNatural,
  guardarActividadJuridica,
  ActividadTipoIncorrectoError,
  ActividadCiiuInvalidoError,
} from "../contactoActividad.service";

jest.mock("../../../repositories/contactos/contactoActividad.repository");
jest.mock("../../../repositories/ciiu/ciiu.repository");
jest.mock("../contacto.service");

const baseUser = {
  oid: "user-1",
  name: "Test",
  preferred_username: "test@example.com",
} as any;

const contactoNatural = { id: "10", pid: 10, tipoContacto: "NATURAL", responsableId: "user-1" };
const contactoJuridica = { id: "20", pid: 20, tipoContacto: "JURIDICA", responsableId: "user-1" };

describe("contactoActividad.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("obtenerActividad", () => {
    test("devuelve null (anti-enumeración) cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await obtenerActividad("999", baseUser);

      expect(res).toBeNull();
      expect(repository.findActividadByContacto).not.toHaveBeenCalled();
    });

    test("NATURAL: devuelve únicamente {tipoContacto, actividad}, sin trabajos", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.findActividadByContacto as jest.Mock).mockResolvedValue({ contactoId: "10" });

      const res = await obtenerActividad("10", baseUser);

      expect(repository.findActividadByContacto).toHaveBeenCalledWith(10);
      expect(repository.findTrabajosByContacto).not.toHaveBeenCalled();
      expect(res).toEqual({ tipoContacto: "NATURAL", actividad: { contactoId: "10" } });
      expect(res).not.toHaveProperty("trabajos");
    });

    test("JURIDICA: devuelve únicamente {tipoContacto, actividad}, sin trabajos", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
      (repository.findActividadByContacto as jest.Mock).mockResolvedValue({ contactoId: "20" });

      const res = await obtenerActividad("20", baseUser);

      expect(repository.findTrabajosByContacto).not.toHaveBeenCalled();
      expect(res).toEqual({ tipoContacto: "JURIDICA", actividad: { contactoId: "20" } });
      expect(res).not.toHaveProperty("trabajos");
    });
  });

  describe("guardarActividadNatural", () => {
    test("devuelve null (anti-enumeración) cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await guardarActividadNatural(
        "999",
        { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" } as any,
        baseUser,
      );

      expect(res).toBeNull();
      expect(repository.guardarActividadConTrabajos).not.toHaveBeenCalled();
    });

    test("rechaza con ActividadTipoIncorrectoError cuando el contacto REAL es JURIDICA (nunca confía en el Frontend)", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);

      await expect(
        guardarActividadNatural(
          "20",
          { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" } as any,
          baseUser,
        ),
      ).rejects.toBeInstanceOf(ActividadTipoIncorrectoError);

      expect(repository.guardarActividadConTrabajos).not.toHaveBeenCalled();
    });

    // 🔐 Requisito explícito de la Etapa 3: la validación de
    // empresaContactoId ya no pertenece al flujo de Actividad. Prueba
    // estructural (no solo de comportamiento): contactoActividad.service.ts
    // ya no importa empresaBusqueda.repository en absoluto (ver el
    // import list de este archivo, arriba) -- no hay nada que mockear.
    // A nivel de comportamiento, el único argumento que
    // guardarActividadConTrabajos recibe es la Actividad + el actor,
    // sin ningún dato de trabajos/empresa.
    test("guarda ÚNICAMENTE gradoInstruccion/profesionOcupacion -- sin validar ni enviar ningún dato de trabajos/empresa", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);
      (repository.guardarActividadConTrabajos as jest.Mock).mockResolvedValue({
        actividad: { contactoId: "10", gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
      });

      const res = await guardarActividadNatural(
        "10",
        { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" } as any,
        baseUser,
      );

      expect(repository.guardarActividadConTrabajos).toHaveBeenCalledWith(
        10,
        { gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
        null,
        { id: "user-1", nombre: "Test", correo: "test@example.com" },
      );
      expect(repository.guardarActividadConTrabajos).toHaveBeenCalledTimes(1);
      // Solo 4 argumentos -- ya no hay un 5to argumento de trabajos.
      expect((repository.guardarActividadConTrabajos as jest.Mock).mock.calls[0]).toHaveLength(4);
      expect(res).toEqual({
        tipoContacto: "NATURAL",
        actividad: { contactoId: "10", gradoInstruccion: "TECNICO", profesionOcupacion: "Contador" },
      });
      expect(res).not.toHaveProperty("trabajos");
    });
  });

  describe("guardarActividadJuridica", () => {
    test("devuelve null (anti-enumeración) cuando el contacto no existe o no es del usuario", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(null);

      const res = await guardarActividadJuridica("999", { ciiuId: 1 } as any, baseUser);

      expect(res).toBeNull();
      expect(repository.guardarActividadConTrabajos).not.toHaveBeenCalled();
    });

    test("rechaza con ActividadTipoIncorrectoError cuando el contacto REAL es NATURAL", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoNatural);

      await expect(
        guardarActividadJuridica("10", { ciiuId: 1 } as any, baseUser),
      ).rejects.toBeInstanceOf(ActividadTipoIncorrectoError);

      expect(repository.guardarActividadConTrabajos).not.toHaveBeenCalled();
    });

    test("rechaza con ActividadCiiuInvalidoError cuando el ciiuId no existe/no está activo", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
      (ciiuRepository.findCiiuById as jest.Mock).mockResolvedValue(null);

      await expect(
        guardarActividadJuridica("20", { ciiuId: 999 } as any, baseUser),
      ).rejects.toBeInstanceOf(ActividadCiiuInvalidoError);

      expect(repository.guardarActividadConTrabajos).not.toHaveBeenCalled();
    });

    test("guarda cuando el ciiuId es válido, sin trabajos en la respuesta", async () => {
      (contactoService.obtenerContactoPorId as jest.Mock).mockResolvedValue(contactoJuridica);
      (ciiuRepository.findCiiuById as jest.Mock).mockResolvedValue({ ciiuId: 12, codigo: "6201" });
      (repository.guardarActividadConTrabajos as jest.Mock).mockResolvedValue({
        actividad: { contactoId: "20", ciiuId: 12 },
      });

      const res = await guardarActividadJuridica("20", { ciiuId: 12 } as any, baseUser);

      expect(repository.guardarActividadConTrabajos).toHaveBeenCalledWith(
        20,
        null,
        { ciiuId: 12 },
        expect.anything(),
      );
      expect((repository.guardarActividadConTrabajos as jest.Mock).mock.calls[0]).toHaveLength(4);
      expect(res).toEqual({
        tipoContacto: "JURIDICA",
        actividad: { contactoId: "20", ciiuId: 12 },
      });
      expect(res).not.toHaveProperty("trabajos");
    });
  });
});
