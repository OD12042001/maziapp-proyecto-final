import { validateContactoCreate } from "../contacto.validator";

/**
 * Cobertura de los escenarios 1-11 y 15-17 pedidos en Fase 3, sección
 * 17. Los escenarios 12-14 (duplicado 409, sin token 401, sin rol 403)
 * y 18 (SQL injection) no son responsabilidad del validador — se
 * cubren en createContacto.test.ts y contacto.repository.test.ts.
 */
describe("contactoCreateSchema", () => {
  const base = {
    celular: "+51987654321",
  };

  test("1. NATURAL + DNI válido -> aceptado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
    });
    expect(r.success).toBe(true);
  });

  test("2. NATURAL + CE válido -> aceptado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "CE",
      numeroDocumento: "ABC12345",
      nombres: "Juan",
      apellidos: "Perez",
    });
    expect(r.success).toBe(true);
  });

  test("3. NATURAL + PASAPORTE válido -> aceptado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "PASAPORTE",
      numeroDocumento: "AB123456",
      nombres: "Juan",
      apellidos: "Perez",
    });
    expect(r.success).toBe(true);
  });

  test("4. JURIDICA + RUC válido -> aceptado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "JURIDICA",
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
      razonSocial: "ACME SAC",
    });
    expect(r.success).toBe(true);
  });

  test("5. NATURAL + RUC -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
      nombres: "Juan",
      apellidos: "Perez",
    });
    expect(r.success).toBe(false);
  });

  test("6. JURIDICA + DNI -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "JURIDICA",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      razonSocial: "ACME SAC",
    });
    expect(r.success).toBe(false);
  });

  test("7. NATURAL sin Nombres -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      apellidos: "Perez",
    });
    expect(r.success).toBe(false);
  });

  test("8. NATURAL sin Apellidos -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
    });
    expect(r.success).toBe(false);
  });

  test("9. JURIDICA sin RazonSocial -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "JURIDICA",
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
    });
    expect(r.success).toBe(false);
  });

  test("10. JURIDICA con Nombres -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "JURIDICA",
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
      razonSocial: "ACME SAC",
      nombres: "Juan",
    });
    expect(r.success).toBe(false);
  });

  test("11. JURIDICA con Apellidos -> rechazado", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "JURIDICA",
      tipoDocumento: "RUC",
      numeroDocumento: "20123456789",
      razonSocial: "ACME SAC",
      apellidos: "Perez",
    });
    expect(r.success).toBe(false);
  });

  test("15. responsableId enviado manualmente -> rechazado por Zod (.strict())", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      responsableId: "11111111-1111-1111-1111-111111111111",
    } as any);
    expect(r.success).toBe(false);
  });

  test("16. creadoId enviado manualmente -> rechazado por Zod (.strict())", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      creadoId: "22222222-2222-2222-2222-222222222222",
    } as any);
    expect(r.success).toBe(false);
  });

  test("17. propiedad desconocida -> rechazado por Zod .strict()", () => {
    const r = validateContactoCreate({
      ...base,
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      propiedadInventada: "cualquier valor",
    } as any);
    expect(r.success).toBe(false);
  });

  test("Campos de auditoría/Id/EstadoContacto no existen como claves aceptadas", () => {
    const camposProhibidos = [
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
    ];
    for (const campo of camposProhibidos) {
      const r = validateContactoCreate({
        ...base,
        tipoContacto: "NATURAL",
        tipoDocumento: "DNI",
        numeroDocumento: "12345678",
        nombres: "Juan",
        apellidos: "Perez",
        [campo]: "valor-cualquiera",
      } as any);
      expect(r.success).toBe(false);
    }
  });

  test("Correo inválido -> rechazado", () => {
    const r = validateContactoCreate({
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      correo: "no-es-un-correo",
    });
    expect(r.success).toBe(false);
  });

  test("Correo válido -> aceptado", () => {
    const r = validateContactoCreate({
      tipoContacto: "NATURAL",
      tipoDocumento: "DNI",
      numeroDocumento: "12345678",
      nombres: "Juan",
      apellidos: "Perez",
      correo: "juan.perez@example.com",
    });
    expect(r.success).toBe(true);
  });

  // 🔧 Fase 3.14 — cobertura adicional de RUC (JURIDICA), pedida al
  // investigar un 400 real de "Formato de RUC inválido". La
  // investigación (ver informe) NO encontró ningún defecto de código:
  // este bloque solo AMPLÍA la cobertura ya existente del escenario 4
  // ("JURIDICA + RUC válido -> aceptado", sin cambios), agregando los
  // casos límite que antes no estaban explícitamente cubiertos.
  describe("JURIDICA + RUC — casos límite (Fase 3.14)", () => {
    test("RUC de menos de 11 dígitos -> rechazado", () => {
      const r = validateContactoCreate({
        ...base,
        tipoContacto: "JURIDICA",
        tipoDocumento: "RUC",
        numeroDocumento: "2012345678", // 10 dígitos
        razonSocial: "ACME SAC",
      });
      expect(r.success).toBe(false);
    });

    test("RUC de más de 11 dígitos -> rechazado", () => {
      const r = validateContactoCreate({
        ...base,
        tipoContacto: "JURIDICA",
        tipoDocumento: "RUC",
        numeroDocumento: "201234567890", // 12 dígitos
        razonSocial: "ACME SAC",
      });
      expect(r.success).toBe(false);
    });

    test("RUC con letras -> rechazado", () => {
      const r = validateContactoCreate({
        ...base,
        tipoContacto: "JURIDICA",
        tipoDocumento: "RUC",
        numeroDocumento: "2012345678A",
        razonSocial: "ACME SAC",
      });
      expect(r.success).toBe(false);
    });

    test("RUC con caracteres no permitidos (guion) -> rechazado", () => {
      const r = validateContactoCreate({
        ...base,
        tipoContacto: "JURIDICA",
        tipoDocumento: "RUC",
        numeroDocumento: "20-123456789",
        razonSocial: "ACME SAC",
      });
      expect(r.success).toBe(false);
    });
  });
});
