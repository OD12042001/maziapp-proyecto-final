/**
 * Migración de roles (agosto 2026) — fase 2: la matriz de autorización
 * de reportes ya no vive en memoria (config/roles.ts::REPORTES_ROLES,
 * eliminado); reporte.service.ts consulta ahora
 * repositories/reportes/reporteRol.repository.ts, que a su vez lee
 * dbo.ReporteRoles. Esta suite mockea ese repositorio (no hay base de
 * datos real disponible en este entorno) para probar exclusivamente la
 * lógica de obtenerReporte: cómo combina "el reporte existe" (mapa de
 * URLs en código) con "el usuario tiene un rol autorizado" (dato).
 */
import { obtenerReporte } from "../reporte.service";
import { findRolesActivosPorReporteClave } from "../../../repositories/reportes/reporteRol.repository";

jest.mock("../../../repositories/reportes/reporteRol.repository");

const mockFindRoles = findRolesActivosPorReporteClave as jest.Mock;

describe("reporte.service :: obtenerReporte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("reporte inexistente -> 404 (no llega a consultar la base de datos)", async () => {
    const res = await obtenerReporte("no_existe", ["direccion_comercial"]);
    expect(res).toEqual({ ok: false, status: 404 });
    expect(mockFindRoles).not.toHaveBeenCalled();
  });

  test("rol autorizado (presente en dbo.ReporteRoles) -> acceso permitido", async () => {
    mockFindRoles.mockResolvedValue(["direccion_comercial"]);
    const res = await obtenerReporte("avance_ejecutivas", ["direccion_comercial"]);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.url).toContain("powerbi.com");
  });

  test("rol no autorizado (no está en dbo.ReporteRoles para ese reporte) -> 403", async () => {
    mockFindRoles.mockResolvedValue(["direccion_comercial"]);
    const res = await obtenerReporte("avance_ejecutivas", ["ejecutivo_inversion"]);
    expect(res).toEqual({ ok: false, status: 403 });
  });

  test("múltiples roles en el JWT -> autorizado si al menos uno tiene relación activa", async () => {
    mockFindRoles.mockResolvedValue(["gerencia_general"]);
    const res = await obtenerReporte("control_operaciones", [
      "compliance",
      "administracion",
      "gerencia_general",
    ]);
    expect(res.ok).toBe(true);
  });

  test("relación ReporteRol desactivada (Activo = 0) -> acceso denegado", async () => {
    // El repositorio ya filtra Activo = 1 en la query (ver
    // reporteRol.repository.test.ts); una relación desactivada
    // simplemente no aparece en lo que devuelve. Aquí se simula ese
    // resultado: direccion_comercial fue revocado de este reporte.
    mockFindRoles.mockResolvedValue([]);
    const res = await obtenerReporte("funnel_conversion", ["direccion_comercial"]);
    expect(res).toEqual({ ok: false, status: 403 });
  });

  test("rol legacy (supervisor_inversion) autorizado mientras esté en dbo.ReporteRoles -> acceso permitido", async () => {
    mockFindRoles.mockResolvedValue(["direccion_comercial", "supervisor_inversion"]);
    const res = await obtenerReporte("control_operaciones", ["supervisor_inversion"]);
    expect(res.ok).toBe(true);
  });

  test("rol legacy YA NO presente en dbo.ReporteRoles (retiro post-transición) -> 403, sin cambiar código", async () => {
    // Simula el estado post-retiro: alguien desactivó/borró la fila de
    // supervisor_inversion en dbo.ReporteRoles. El servicio no necesita
    // cambiar para reflejar eso — es exactamente el punto de este
    // diseño.
    mockFindRoles.mockResolvedValue(["direccion_comercial"]);
    const res = await obtenerReporte("control_operaciones", ["supervisor_inversion"]);
    expect(res).toEqual({ ok: false, status: 403 });
  });

  test("sin roles -> 403", async () => {
    mockFindRoles.mockResolvedValue(["direccion_comercial"]);
    const res = await obtenerReporte("control_operaciones", []);
    expect(res).toEqual({ ok: false, status: 403 });
  });

  test("comparación de rol insensible a mayúsculas/minúsculas", async () => {
    mockFindRoles.mockResolvedValue(["direccion_comercial"]);
    const res = await obtenerReporte("funnel_conversion", ["DIRECCION_COMERCIAL"]);
    expect(res.ok).toBe(true);
  });

  test("consulta el repositorio con la clave del reporte solicitado", async () => {
    mockFindRoles.mockResolvedValue(["gerencia_general"]);
    await obtenerReporte("control_operaciones", ["gerencia_general"]);
    expect(mockFindRoles).toHaveBeenCalledWith("control_operaciones");
  });
});
