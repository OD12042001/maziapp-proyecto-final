/**
 * Fase 3.15 / 7A — validación de entrada para actualización de
 * Contactos (Cliente + Ubicación). Cubre puntualmente lo que este
 * schema debe garantizar por sí solo: formato de cada campo opcional,
 * y el rechazo con `.strict()` de cualquier campo técnico/de
 * identificación. La coherencia NATURAL/JURIDICA contra la fila
 * EXISTENTE no se prueba aquí (Zod no conoce esa fila) — se prueba en
 * `contacto.service.test.ts::actualizarContacto`.
 */
import { validateContactoUpdate } from "../contactoUpdate.validator";

describe("contactoUpdate.validator", () => {
  test("payload vacío ({}) es válido (actualización parcial: nada que cambiar)", () => {
    const res = validateContactoUpdate({});
    expect(res.success).toBe(true);
  });

  test("actualización válida de Cliente (NATURAL): solo nombres/apellidos", () => {
    const res = validateContactoUpdate({
      nombres: "Juan",
      apellidos: "Perez",
    });
    expect(res.success).toBe(true);
  });

  test("actualización válida de Cliente (JURIDICA): solo razonSocial", () => {
    const res = validateContactoUpdate({ razonSocial: "Empresa SAC" });
    expect(res.success).toBe(true);
  });

  test("actualización válida de Ubicación: celular/correo/telefonoFijo", () => {
    const res = validateContactoUpdate({
      celular: "999888777",
      correo: "juan@example.com",
      telefonoFijo: "014567890",
    });
    expect(res.success).toBe(true);
  });

  test("nombres vacío -> rechazado", () => {
    const res = validateContactoUpdate({ nombres: "" });
    expect(res.success).toBe(false);
  });

  test("razonSocial vacío -> rechazado", () => {
    const res = validateContactoUpdate({ razonSocial: "" });
    expect(res.success).toBe(false);
  });

  test("correo con formato inválido -> rechazado", () => {
    const res = validateContactoUpdate({ correo: "no-es-un-correo" });
    expect(res.success).toBe(false);
  });

  test("celular con caracteres no permitidos -> rechazado", () => {
    const res = validateContactoUpdate({ celular: "abc-no-valido!!" });
    expect(res.success).toBe(false);
  });

  test("sexo fuera del enum permitido -> rechazado", () => {
    const res = validateContactoUpdate({ sexo: "OTRO" });
    expect(res.success).toBe(false);
  });

  test("fechaNacimiento con formato inválido -> rechazado", () => {
    const res = validateContactoUpdate({ fechaNacimiento: "31/12/1990" });
    expect(res.success).toBe(false);
  });

  test("esPep booleano -> aceptado", () => {
    const res = validateContactoUpdate({ esPep: true });
    expect(res.success).toBe(true);
  });

  // 🔐 Campos técnicos/de identificación — deben quedar rechazados por
  // `.strict()`, incluso si el cliente los envía junto a un campo
  // válido (todo el payload falla, no se descarta en silencio).
  describe("campos técnicos/identificación rechazados por .strict() (Fase 7A)", () => {
    test.each([
      "id",
      "responsableId",
      "creadoId",
      "creadoFecha",
      "creadoNombre",
      "creadoCorreo",
      "actualizadoId",
      "actualizadoFecha",
      "actualizadoNombre",
      "actualizadoCorreo",
      "estadoContacto",
      "tipoContacto",
      "tipoDocumento",
      "numeroDocumento",
    ])("propiedad '%s' -> rechazada", (campo) => {
      const res = validateContactoUpdate({
        nombres: "Juan",
        [campo]: "cualquier-valor",
      });
      expect(res.success).toBe(false);
    });
  });
});
