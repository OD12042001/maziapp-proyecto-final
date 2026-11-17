/**
 * reporteRol.repository :: findRolesActivosPorReporteClave
 *
 * Migración de roles — fase 3 (corrección de arquitectura): ya no
 * existe `dbo.Roles`. Esta suite mockea `config/sql` (mismo patrón que
 * contacto.repository.test.ts) y verifica:
 *   (a) la query enviada a `mssql` es un literal estático parametrizado
 *       (contiene "@clave", nunca el valor recibido concatenado) —
 *       protección contra SQL injection, mismo criterio que el resto
 *       del proyecto;
 *   (b) la query filtra explícitamente por Activo = 1 en dbo.Reportes
 *       y dbo.ReporteRoles (las únicas dos tablas involucradas) — es
 *       el mecanismo por el que una relación revocada (Activo = 0)
 *       deja de autorizar sin necesidad de borrar la fila;
 *   (c) la query NO hace referencia a ninguna tabla de roles (no hay
 *       `dbo.Roles`, no hay JOIN adicional) — el código de rol sale
 *       directo de `ReporteRoles.RoleCodigo`;
 *   (d) el mapeo de filas a códigos de rol es correcto.
 */
import { findRolesActivosPorReporteClave } from "../reporteRol.repository";

let queryText = "";
let claveInput: unknown;
let mockRecordset: Array<{ RoleCodigo: string }> = [];

jest.mock("../../../config/sql", () => {
  const request = {
    input: jest.fn(function (this: any, name: string, _type: unknown, value: unknown) {
      if (name === "clave") claveInput = value;
      return this;
    }),
    query: jest.fn(async (text: string) => {
      queryText = text;
      return { recordset: mockRecordset };
    }),
  };

  const pool = { request: () => request };

  return {
    getPool: async () => pool,
    sql: {
      NVarChar: (n: number) => `NVarChar(${n})`,
    },
  };
});

describe("reporteRol.repository :: findRolesActivosPorReporteClave", () => {
  beforeEach(() => {
    queryText = "";
    claveInput = undefined;
    mockRecordset = [
      { RoleCodigo: "direccion_comercial" },
      { RoleCodigo: "gerencia_general" },
    ];
  });

  test("la query es parametrizada (@clave) y filtra Activo = 1 en Reportes y ReporteRoles", async () => {
    await findRolesActivosPorReporteClave("control_operaciones");

    expect(queryText).toContain("@clave");
    expect(queryText).toContain("rp.Activo = 1");
    expect(queryText).toContain("rr.Activo = 1");
    expect(queryText).toContain("rr.RoleCodigo");
  });

  test("la query no hace referencia a ninguna tabla de catálogo de roles", async () => {
    await findRolesActivosPorReporteClave("control_operaciones");

    // Corrección de arquitectura: dbo.Roles ya no existe. Entra ID es
    // la única fuente de verdad de qué roles existen.
    expect(queryText).not.toMatch(/dbo\.Roles\b/);
    expect(queryText).not.toContain("RoleId");
  });

  test("un valor con sintaxis SQL maliciosa viaja como parámetro, nunca concatenado", async () => {
    const payloadMalicioso = "x'; DROP TABLE dbo.Reportes;--";

    await findRolesActivosPorReporteClave(payloadMalicioso);

    expect(queryText).not.toContain(payloadMalicioso);
    expect(queryText).not.toContain("DROP TABLE");
    expect(claveInput).toBe(payloadMalicioso);
  });

  test("mapea el recordset a un array de códigos de rol", async () => {
    const roles = await findRolesActivosPorReporteClave("control_operaciones");
    expect(roles).toEqual(["direccion_comercial", "gerencia_general"]);
  });

  test("relación sin roles activos -> array vacío (no lanza error)", async () => {
    mockRecordset = [];
    const roles = await findRolesActivosPorReporteClave("avance_ejecutivas");
    expect(roles).toEqual([]);
  });
});
