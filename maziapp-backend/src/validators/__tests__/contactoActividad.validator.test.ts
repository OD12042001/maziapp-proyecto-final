/**
 * Fase Actividad -- Zod schemas de PATCH /api/contactos/{id}/actividad.
 *
 * Cubre: gradoInstruccion/profesionOcupacion OBLIGATORIOS para
 * NATURAL (corrección explícita del dueño del proyecto sobre el
 * diseño v1), catálogo cerrado de gradoInstruccion (solo TECNICO/
 * SUPERIOR), ciiuId obligatorio para JURIDICA, y `.strict()`
 * rechazando campos de la rama contraria.
 *
 * 🔐 ETAPA 3 (arquitectura independiente de Trabajos Dependientes,
 * patrón Direcciones): `trabajosNuevos` fue retirado de
 * `actividadNaturalSchema` -- ya no es un campo aceptado. Como el
 * schema sigue siendo `.strict()`, enviarlo ahora se RECHAZA con 400
 * en vez de aceptarse (ver "rechaza trabajosNuevos" abajo).
 */
import {
  validateActividadNatural,
  validateActividadJuridica,
  GRADOS_INSTRUCCION,
} from "../contactoActividad.validator";

describe("validateActividadNatural", () => {
  test("acepta gradoInstruccion + profesionOcupacion válidos", () => {
    const res = validateActividadNatural({
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
    });
    expect(res.success).toBe(true);
  });

  test("rechaza cuando falta gradoInstruccion", () => {
    const res = validateActividadNatural({ profesionOcupacion: "Contador" });
    expect(res.success).toBe(false);
  });

  test("rechaza cuando falta profesionOcupacion", () => {
    const res = validateActividadNatural({ gradoInstruccion: "TECNICO" });
    expect(res.success).toBe(false);
  });

  test("rechaza profesionOcupacion vacío", () => {
    const res = validateActividadNatural({ gradoInstruccion: "TECNICO", profesionOcupacion: "" });
    expect(res.success).toBe(false);
  });

  test.each(["PRIMARIA", "SECUNDARIA", "MAGISTER", "DOCTORADO", "OTRO"])(
    "rechaza gradoInstruccion fuera del catálogo cerrado ('%s')",
    (valor) => {
      const res = validateActividadNatural({
        gradoInstruccion: valor,
        profesionOcupacion: "Contador",
      });
      expect(res.success).toBe(false);
    },
  );

  test("el catálogo expuesto es exactamente [TECNICO, SUPERIOR]", () => {
    expect(GRADOS_INSTRUCCION).toEqual(["TECNICO", "SUPERIOR"]);
  });

  test("rechaza ciiuId (campo de la rama JURIDICA) vía .strict()", () => {
    const res = validateActividadNatural({
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
      ciiuId: 1,
    });
    expect(res.success).toBe(false);
  });

  // 🔐 Requisito explícito de la Etapa 3: el payload de Actividad ya
  // NO acepta trabajosNuevos -- Trabajos Dependientes se guarda
  // exclusivamente vía sus propios endpoints independientes (Etapa 2).
  // Como `trabajosNuevos` ya no está declarado en el schema y este
  // sigue siendo `.strict()`, enviarlo ahora invalida TODO el payload
  // (400), incluso si el resto de los campos es válido.
  test("rechaza trabajosNuevos vía .strict() -- ya no pertenece al contrato de Actividad", () => {
    const res = validateActividadNatural({
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
      trabajosNuevos: [
        { empresaNombreLibre: "Acme SAC", cargo: "Analista", desde: "2020-01-01" },
      ],
    });
    expect(res.success).toBe(false);
  });

  test("rechaza trabajosModificados/trabajosEliminados vía .strict() -- tampoco pertenecen al contrato de Actividad", () => {
    const conModificados = validateActividadNatural({
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
      trabajosModificados: [],
    });
    const conEliminados = validateActividadNatural({
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
      trabajosEliminados: [],
    });

    expect(conModificados.success).toBe(false);
    expect(conEliminados.success).toBe(false);
  });
});

describe("validateActividadJuridica", () => {
  test("acepta ciiuId válido", () => {
    const res = validateActividadJuridica({ ciiuId: 12 });
    expect(res.success).toBe(true);
  });

  test("rechaza cuando falta ciiuId", () => {
    const res = validateActividadJuridica({});
    expect(res.success).toBe(false);
  });

  test("rechaza ciiuId no entero/no positivo", () => {
    expect(validateActividadJuridica({ ciiuId: -1 }).success).toBe(false);
    expect(validateActividadJuridica({ ciiuId: 1.5 }).success).toBe(false);
    expect(validateActividadJuridica({ ciiuId: 0 }).success).toBe(false);
  });

  test("rechaza campos de la rama NATURAL vía .strict()", () => {
    const res = validateActividadJuridica({
      ciiuId: 12,
      gradoInstruccion: "TECNICO",
      profesionOcupacion: "Contador",
    });
    expect(res.success).toBe(false);
  });
});
