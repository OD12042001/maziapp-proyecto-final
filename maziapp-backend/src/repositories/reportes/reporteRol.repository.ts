import { getPool, sql } from "../../config/sql";

/**
 * Repositorio de autorización Reporte-Rol.
 *
 * Migración de roles (agosto 2026) — fase 3 (corrección de
 * arquitectura): esta base de datos NO cataloga App Roles de
 * Microsoft Entra ID. Entra ID es la ÚNICA fuente de verdad de qué
 * roles existen, a quién están asignados, y qué trae el claim `roles`
 * del JWT. Este repositorio nunca consulta SQL para determinar qué rol
 * tiene un usuario — eso ya llega resuelto en `userRoles` (extraído
 * del JWT validado por `withAuth()`/`validateToken.ts`).
 *
 * Lo único que vive en datos es la relación Reporte <-> RoleCodigo
 * (dbo.Reportes, dbo.ReporteRoles — ver
 * database/schema_reportes_roles.sql y
 * database/seed_reportes_roles.sql). `RoleCodigo` guarda el valor
 * exacto del App Role tal como lo emite Entra ID, como texto plano —
 * sin una tabla `dbo.Roles` ni FK hacia ningún catálogo de roles, para
 * no mantener una copia sincronizada de algo que ya administra Entra
 * ID.
 *
 * Este repositorio es la ÚNICA fuente de verdad que consulta
 * reporte.service.ts::obtenerReporte para decidir autorización de
 * reportes. Administrar accesos (agregar/quitar un rol de un reporte)
 * se hace hoy directamente contra estas tablas (Opción A: SQL
 * controlado por el dueño del proyecto) — no existe todavía un
 * endpoint ni una pantalla para esto.
 */

interface RolAutorizadoRow {
  RoleCodigo: string;
}

/**
 * Devuelve los códigos de rol (dbo.ReporteRoles.RoleCodigo) con acceso
 * ACTIVO al reporte identificado por su Clave (dbo.Reportes.Clave).
 *
 * Filtra por Activo = 1 en ambas tablas: si el reporte fue desactivado,
 * o si la relación específica en ReporteRoles fue revocada
 * (Activo = 0), ese código de rol deja de aparecer en el resultado —
 * sin necesidad de borrar ninguna fila (se conserva la trazabilidad de
 * auditoría).
 */
export async function findRolesActivosPorReporteClave(
  clave: string,
): Promise<string[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("clave", sql.NVarChar(50), clave)
    .query(`
      SELECT rr.RoleCodigo
      FROM dbo.ReporteRoles rr
      INNER JOIN dbo.Reportes rp ON rp.ReporteId = rr.ReporteId
      WHERE rp.Clave = @clave
        AND rp.Activo = 1
        AND rr.Activo = 1
    `);

  return result.recordset.map((row: RolAutorizadoRow) => row.RoleCodigo);
}
