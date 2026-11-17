/**
 * Reglas de entrada del módulo Pipeline (S06).
 *
 * Cada test cubre una regla del contrato aprobado en docs/openapi.yaml:
 * - OportunidadCreate: `contactoId` obligatorio; `montoEstimado` mayor que
 *   cero; `monedaCodigo` del dominio PEN/USD; moneda obligatoria cuando
 *   hay monto.
 * - AvanzarEtapaRequest: `etapaDestinoCodigo` obligatorio (1..30).
 * - PerderOportunidadRequest: `motivo` obligatorio (3..300).
 * - Listado: paginación con topes y filtros tipados.
 */
import {
  crearOportunidadSchema,
  avanzarEtapaSchema,
  perderOportunidadSchema,
  listarOportunidadesQuerySchema,
} from "../pipeline.validator";

describe("pipeline.validator -> crearOportunidadSchema", () => {
  test("acepta el mínimo: solo contactoId", () => {
    const res = crearOportunidadSchema.safeParse({ contactoId: 5 });

    expect(res.success).toBe(true);
  });

  test("rechaza contactoId ausente o no positivo", () => {
    expect(crearOportunidadSchema.safeParse({}).success).toBe(false);
    expect(crearOportunidadSchema.safeParse({ contactoId: 0 }).success).toBe(false);
    expect(crearOportunidadSchema.safeParse({ contactoId: -3 }).success).toBe(false);
    expect(crearOportunidadSchema.safeParse({ contactoId: "5" }).success).toBe(false);
  });

  test("rechaza montoEstimado no positivo", () => {
    expect(
      crearOportunidadSchema.safeParse({
        contactoId: 5,
        montoEstimado: 0,
        monedaCodigo: "PEN",
      }).success,
    ).toBe(false);
    expect(
      crearOportunidadSchema.safeParse({
        contactoId: 5,
        montoEstimado: -1,
        monedaCodigo: "PEN",
      }).success,
    ).toBe(false);
  });

  test("exige monedaCodigo cuando se informa montoEstimado", () => {
    const res = crearOportunidadSchema.safeParse({ contactoId: 5, montoEstimado: 100 });

    expect(res.success).toBe(false);
  });

  test("rechaza monedaCodigo fuera del dominio", () => {
    const res = crearOportunidadSchema.safeParse({
      contactoId: 5,
      montoEstimado: 100,
      monedaCodigo: "EUR",
    });

    expect(res.success).toBe(false);
  });

  test("acepta monto con moneda PEN y con moneda USD", () => {
    expect(
      crearOportunidadSchema.safeParse({
        contactoId: 5,
        montoEstimado: 200000,
        monedaCodigo: "PEN",
      }).success,
    ).toBe(true);

    expect(
      crearOportunidadSchema.safeParse({
        contactoId: 5,
        montoEstimado: 50000,
        monedaCodigo: "USD",
      }).success,
    ).toBe(true);
  });

  test("descarta campos no declarados (no se puede fijar responsableId ni etapa desde el cliente)", () => {
    const res = crearOportunidadSchema.safeParse({
      contactoId: 5,
      responsableId: "00000000-0000-0000-0000-000000000001",
      etapaId: 8,
      estado: "GANADA",
    });

    expect(res.success).toBe(false);
  });
});

describe("pipeline.validator -> avanzarEtapaSchema", () => {
  test("exige etapaDestinoCodigo no vacío y de hasta 30 caracteres", () => {
    expect(avanzarEtapaSchema.safeParse({}).success).toBe(false);
    expect(avanzarEtapaSchema.safeParse({ etapaDestinoCodigo: "" }).success).toBe(false);
    expect(
      avanzarEtapaSchema.safeParse({ etapaDestinoCodigo: "X".repeat(31) }).success,
    ).toBe(false);
  });

  test("acepta un código válido sin observación", () => {
    expect(avanzarEtapaSchema.safeParse({ etapaDestinoCodigo: "CONTACTADO" }).success).toBe(
      true,
    );
  });

  test("limita la observación a 1000 caracteres", () => {
    expect(
      avanzarEtapaSchema.safeParse({
        etapaDestinoCodigo: "CONTACTADO",
        observacion: "X".repeat(1001),
      }).success,
    ).toBe(false);
  });
});

describe("pipeline.validator -> perderOportunidadSchema", () => {
  test("exige motivo de entre 3 y 300 caracteres", () => {
    expect(perderOportunidadSchema.safeParse({}).success).toBe(false);
    expect(perderOportunidadSchema.safeParse({ motivo: "ab" }).success).toBe(false);
    expect(perderOportunidadSchema.safeParse({ motivo: "X".repeat(301) }).success).toBe(false);
    expect(perderOportunidadSchema.safeParse({ motivo: "Sin presupuesto" }).success).toBe(true);
  });
});

describe("pipeline.validator -> listarOportunidadesQuerySchema", () => {
  test("aplica page=1 y pageSize=20 por omisión", () => {
    const res = listarOportunidadesQuerySchema.parse({});

    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
  });

  test("convierte los valores de query string a número", () => {
    const res = listarOportunidadesQuerySchema.parse({ page: "3", pageSize: "50" });

    expect(res.page).toBe(3);
    expect(res.pageSize).toBe(50);
  });

  test("rechaza pageSize mayor que 100 y page menor que 1", () => {
    expect(listarOportunidadesQuerySchema.safeParse({ pageSize: "101" }).success).toBe(false);
    expect(listarOportunidadesQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  test("rechaza un estado fuera del dominio", () => {
    expect(listarOportunidadesQuerySchema.safeParse({ estado: "CERRADA" }).success).toBe(false);
    expect(listarOportunidadesQuerySchema.safeParse({ estado: "GANADA" }).success).toBe(true);
  });

  test("rechaza un responsableId que no es UUID", () => {
    expect(
      listarOportunidadesQuerySchema.safeParse({ responsableId: "no-es-uuid" }).success,
    ).toBe(false);
  });
});
