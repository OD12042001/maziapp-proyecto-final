/**
 * Autorizacion de reportes Power BI.
 *
 * Migracion de roles (agosto 2026) -- fase 2: la matriz de que App
 * Role puede ver que reporte dejo de ser un mapa en memoria
 * (config/roles.ts::REPORTES_ROLES) y ahora se consulta en tiempo real
 * contra dbo.ReporteRoles (ver
 * repositories/reportes/reporteRol.repository.ts). Esto permite
 * agregar/quitar roles de un reporte sin desplegar codigo -- ver
 * database/schema_reportes_roles.sql para el diseno aprobado.
 *
 * Lo que SI permanece en codigo, por decision explicita del dueno del
 * proyecto: las URLs de embed de Power BI (no se persisten en base de
 * datos). En el proyecto original estas URLs vivian en el bundle del
 * frontend (powerbi-view.component.ts), protegidas solo por el
 * roleGuard del lado del cliente -- ver auditoria #2. Aqui el mapa de
 * URLs vive unicamente en el backend; el endpoint que lo expone
 * (functions/reportes/getReporteEmbed.ts) exige autorizacion real
 * (Entra ID + dbo.ReporteRoles) antes de devolver la URL.
 */
import { findRolesActivosPorReporteClave } from "../../repositories/reportes/reporteRol.repository";

interface ReporteConfig {
  url: string;
}

const REPORTES: Record<string, ReporteConfig> = {
  avance_ejecutivas: {
    url: "https://app.powerbi.com/view?r=eyJrIjoiZjAwNWIyZGMtZjI1MC00NDdjLTlhYzItN2RlMGNjZjc2YWRjIiwidCI6ImUwY2NmYTAxLWVmN2MtNGNlNS1hYzFjLWI3ZWVhOWIwMDZjYiJ9",
  },
  control_operaciones: {
    url: "https://app.powerbi.com/view?r=eyJrIjoiZmRkMmIwN2UtODdjNS00YTY1LTkyNzAtZTM1NDkzOTJlNTQ0IiwidCI6ImUwY2NmYTAxLWVmN2MtNGNlNS1hYzFjLWI3ZWVhOWIwMDZjYiJ9",
  },
  funnel_conversion: {
    url: "https://app.powerbi.com/view?r=eyJrIjoiNTg3NTI2MmMtNzk2Mi00OGJjLWJkNjktNDRjOWFlN2ZkYmYzIiwidCI6ImUwY2NmYTAxLWVmN2MtNGNlNS1hYzFjLWI3ZWVhOWIwMDZjYiJ9",
  },
};

export async function obtenerReporte(key: string, userRoles: string[]) {
  const reporte = REPORTES[key];

  if (!reporte) {
    return { ok: false as const, status: 404 as const };
  }

  const rolesAutorizados = await findRolesActivosPorReporteClave(key);

  const normalizedUserRoles = userRoles.map((r) => r.toLowerCase());
  const normalizedAutorizados = rolesAutorizados.map((r) => r.toLowerCase());

  const autorizado = normalizedAutorizados.some((role) =>
    normalizedUserRoles.includes(role),
  );

  if (!autorizado) {
    return { ok: false as const, status: 403 as const };
  }

  return { ok: true as const, url: reporte.url };
}
