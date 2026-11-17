/**
 * Migración de roles (agosto 2026): contacto.service.ts ya no tiene una
 * rama "isSupervisor -> ver todos los Contactos" (ese rol es legacy y no
 * tiene sucesor confirmado — ver Auditoria_MaziFlow_Migracion_Roles.docx,
 * secciones 13-16). Esta suite prueba que el listado y la consulta por
 * id quedan SIEMPRE acotados a la cartera del usuario (responsableId),
 * sin importar qué rol traiga el token — la restricción de qué rol
 * puede llegar hasta aquí ya la aplica withAuth en la Function, no este
 * Service.
 *
 * ⚠️ Nota (Fase 7A): este archivo se reconstruyó a partir de
 * `dist/src/services/contactos/__tests__/contacto.service.test.js`
 * (la única copia disponible: el `.ts` fuente ya no existía en el
 * repositorio del usuario al retomar esta fase, aunque el compilado
 * en `dist/` sí). El contenido de los describe/test de "listarContactos"
 * y "obtenerContactoPorId" (incluida la sección "ownership
 * case-insensitive (Fase 3.13)") es una reconstrucción fiel de ese
 * compilado — no se perdió ni se reescribió ningún caso de prueba.
 */
import * as repository from "../../../repositories/contactos/contacto.repository";
import {
  listarContactos,
  obtenerContactoPorId,
  actualizarContacto,
  ContactoValidationError,
} from "../contacto.service";

jest.mock("../../../repositories/contactos/contacto.repository");

const baseUser = {
  oid: "user-1",
  name: "Test",
  preferred_username: "test@example.com",
} as any;

describe("contacto.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("listarContactos", () => {
    test("siempre usa findContactosByOwner (nunca findAllContactos), sin importar el rol", async () => {
      (repository.findContactosByOwner as jest.Mock).mockResolvedValue([
        { id: "1" },
      ]);

      for (const roles of [["ejecutivo_inversion"], ["supervisor_inversion"], []]) {
        await listarContactos({ ...baseUser, roles });
      }

      expect(repository.findContactosByOwner).toHaveBeenCalledTimes(3);
      expect(repository.findContactosByOwner).toHaveBeenCalledWith("user-1");
      expect(repository.findAllContactos).not.toHaveBeenCalled();
    });
  });

  describe("obtenerContactoPorId", () => {
    test("devuelve el contacto cuando responsableId coincide con el usuario", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        responsableId: "user-1",
      });

      const res = await obtenerContactoPorId("1", {
        ...baseUser,
        roles: ["ejecutivo_inversion"],
      });

      expect(res).toEqual({ id: "1", responsableId: "user-1" });
    });

    test("devuelve null (anti-enumeración) cuando el contacto existe pero no es del usuario, aunque el rol sea supervisor_inversion (legacy)", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        responsableId: "otro-usuario",
      });

      const res = await obtenerContactoPorId("1", {
        ...baseUser,
        roles: ["supervisor_inversion"],
      });

      // No hay rama "supervisor ve todos": null igual que cualquier
      // otro rol, porque ese comportamiento no tiene sucesor confirmado.
      expect(res).toBeNull();
    });

    test("devuelve null cuando el contacto no existe", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue(null);

      const res = await obtenerContactoPorId("999", {
        ...baseUser,
        roles: ["ejecutivo_inversion"],
      });

      expect(res).toBeNull();
    });

    // 🔧 Fase 3.13 — CORRECCIÓN DE OWNERSHIP (case-insensitive):
    // `mssql`/`tedious` devuelve los `uniqueidentifier` de SQL Server en
    // MAYÚSCULAS, mientras que el claim `oid` del JWT de Microsoft Entra
    // ID llega en minúsculas. Estos casos comprueban que la comparación
    // de ownership sigue siendo la MISMA regla (responsableId ===
    // user.oid), solo que ahora normalizada, y que sigue fallando de
    // forma segura cuando falta cualquiera de los dos valores.
    describe("ownership case-insensitive (Fase 3.13)", () => {
      const oidMinusculas = "c5f70284-66e8-4a20-b314-8ae2edc81779";
      const oidMayusculas = "C5F70284-66E8-4A20-B314-8AE2EDC81779";

      test("1) GUID con exactamente la misma capitalización → ownership permitido", async () => {
        (repository.findContactoById as jest.Mock).mockResolvedValue({
          id: "1",
          responsableId: oidMinusculas,
        });

        const res = await obtenerContactoPorId("1", {
          ...baseUser,
          oid: oidMinusculas,
          roles: ["ejecutivo_inversion"],
        });

        expect(res).toEqual({ id: "1", responsableId: oidMinusculas });
      });

      test("2) GUID con distinta capitalización (BD en mayúsculas, JWT en minúsculas) → ownership permitido", async () => {
        (repository.findContactoById as jest.Mock).mockResolvedValue({
          id: "1",
          responsableId: oidMayusculas,
        });

        const res = await obtenerContactoPorId("1", {
          ...baseUser,
          oid: oidMinusculas,
          roles: ["ejecutivo_inversion"],
        });

        expect(res).toEqual({ id: "1", responsableId: oidMayusculas });
      });

      test("3) GUID realmente diferente (no es solo un problema de mayúsculas) → ownership rechazado", async () => {
        (repository.findContactoById as jest.Mock).mockResolvedValue({
          id: "1",
          responsableId: oidMayusculas,
        });

        const res = await obtenerContactoPorId("1", {
          ...baseUser,
          oid: "11111111-1111-1111-1111-111111111111",
          roles: ["ejecutivo_inversion"],
        });

        expect(res).toBeNull();
      });

      test("4) responsableId ausente en la fila → ownership rechazado (falla de forma segura, no se asume autorizado)", async () => {
        (repository.findContactoById as jest.Mock).mockResolvedValue({
          id: "1",
          responsableId: null,
        });

        const res = await obtenerContactoPorId("1", {
          ...baseUser,
          oid: oidMinusculas,
          roles: ["ejecutivo_inversion"],
        });

        expect(res).toBeNull();
      });

      test("5) user.oid ausente en el token → ownership rechazado (falla de forma segura, no se asume autorizado)", async () => {
        (repository.findContactoById as jest.Mock).mockResolvedValue({
          id: "1",
          responsableId: oidMayusculas,
        });

        const res = await obtenerContactoPorId("1", {
          ...baseUser,
          oid: undefined,
          roles: ["ejecutivo_inversion"],
        });

        expect(res).toBeNull();
      });
    });
  });

  // ✏️ Fase 3.15 / 7A — actualizarContacto (Cliente + Ubicación).
  describe("actualizarContacto", () => {
    const oidMinusculas = "c5f70284-66e8-4a20-b314-8ae2edc81779";
    const oidMayusculas = "C5F70284-66E8-4A20-B314-8AE2EDC81779";

    test("actualización correcta de Cliente (NATURAL): reenvía solo los campos enviados", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        nombres: "Juan Actualizado",
      });

      const res = await actualizarContacto(
        "1",
        { nombres: "Juan Actualizado" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).toEqual({
        id: "1",
        tipoContacto: "NATURAL",
        nombres: "Juan Actualizado",
      });
      expect(repository.updateContacto).toHaveBeenCalledWith(
        1,
        { nombres: "Juan Actualizado" },
        expect.objectContaining({ actualizadoId: oidMinusculas }),
      );
    });

    test("actualización correcta de Ubicación: reenvía solo celular/correo/telefonoFijo enviados", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({
        id: "1",
        celular: "999888777",
      });

      const res = await actualizarContacto(
        "1",
        { celular: "999888777", correo: "juan@example.com" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).toEqual({ id: "1", celular: "999888777" });
      expect(repository.updateContacto).toHaveBeenCalledWith(
        1,
        { celular: "999888777", correo: "juan@example.com" },
        expect.anything(),
      );
    });

    test("el dueño del contacto puede actualizarlo", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({ id: "1" });

      const res = await actualizarContacto(
        "1",
        { celular: "999888777" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).not.toBeNull();
    });

    test("un contacto ajeno no puede actualizarse (devuelve null, anti-enumeración -> 404 en la Function)", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: "11111111-1111-1111-1111-111111111111",
      });

      const res = await actualizarContacto(
        "1",
        { celular: "999888777" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).toBeNull();
      expect(repository.updateContacto).not.toHaveBeenCalled();
    });

    test("GUID con distinta capitalización (BD mayúsculas, JWT minúsculas) sigue permitiendo actualizar (reutiliza Fase 3.13)", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMayusculas,
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({ id: "1" });

      const res = await actualizarContacto(
        "1",
        { celular: "999888777" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).not.toBeNull();
    });

    test("campos técnicos/identificación no forman parte de ContactoUpdateInput: aunque llegaran, nunca se reenvían al repository", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({ id: "1" });

      // Simula un input ya "colado" por alguna capa superior con una
      // propiedad extra que TypeScript no permitiría, forzado con `as any`
      // para probar que el service, aun así, solo copia las claves que
      // conoce explícitamente (nunca `{ ...input }` directo).
      const inputConCampoTecnico: any = {
        celular: "999888777",
        responsableId: "otro-oid-cualquiera",
        id: "999",
      };

      await actualizarContacto(
        "1",
        inputConCampoTecnico,
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      const fieldsEnviados = (repository.updateContacto as jest.Mock).mock
        .calls[0][1];
      expect(fieldsEnviados).toEqual({ celular: "999888777" });
      expect(fieldsEnviados.responsableId).toBeUndefined();
      expect(fieldsEnviados.id).toBeUndefined();
    });

    test("razonSocial en un contacto NATURAL -> ContactoValidationError, sin llamar al repository", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
      });

      await expect(
        actualizarContacto(
          "1",
          { razonSocial: "Empresa SAC" } as any,
          { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
        ),
      ).rejects.toBeInstanceOf(ContactoValidationError);

      expect(repository.updateContacto).not.toHaveBeenCalled();
    });

    test("nombres/apellidos en un contacto JURIDICA -> ContactoValidationError, sin llamar al repository", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "2",
        tipoContacto: "JURIDICA",
        responsableId: oidMinusculas,
      });

      await expect(
        actualizarContacto(
          "2",
          { nombres: "Juan" } as any,
          { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
        ),
      ).rejects.toBeInstanceOf(ContactoValidationError);

      expect(repository.updateContacto).not.toHaveBeenCalled();
    });

    test("payload vacío ({}) no ejecuta ningún UPDATE y devuelve el contacto existente sin modificar", async () => {
      const existente = {
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
        nombres: "Juan",
      };
      (repository.findContactoById as jest.Mock).mockResolvedValue(existente);

      const res = await actualizarContacto(
        "1",
        {},
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      expect(res).toEqual(existente);
      expect(repository.updateContacto).not.toHaveBeenCalled();
    });

    test("datos existentes no modificados no se pisan: solo se envían al repository las claves realmente presentes en el input", async () => {
      (repository.findContactoById as jest.Mock).mockResolvedValue({
        id: "1",
        tipoContacto: "NATURAL",
        responsableId: oidMinusculas,
        nombres: "Juan",
        apellidos: "Perez",
        celular: "999111222",
      });
      (repository.updateContacto as jest.Mock).mockResolvedValue({ id: "1" });

      // Solo se envía `correo`: `nombres`, `apellidos` y `celular`
      // existentes no deben aparecer (ni en null ni en ningún otro
      // valor) en el objeto `fields` que llega al repository.
      await actualizarContacto(
        "1",
        { correo: "nuevo@example.com" },
        { ...baseUser, oid: oidMinusculas, roles: ["ejecutivo_inversion"] },
      );

      const fieldsEnviados = (repository.updateContacto as jest.Mock).mock
        .calls[0][1];
      expect(fieldsEnviados).toEqual({ correo: "nuevo@example.com" });
      expect(Object.prototype.hasOwnProperty.call(fieldsEnviados, "nombres")).toBe(
        false,
      );
      expect(
        Object.prototype.hasOwnProperty.call(fieldsEnviados, "apellidos"),
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(fieldsEnviados, "celular"),
      ).toBe(false);
    });
  });
});
