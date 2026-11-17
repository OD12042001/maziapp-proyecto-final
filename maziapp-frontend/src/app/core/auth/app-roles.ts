/**
 * Roles de negocio — Mazi Flow (frontend)
 *
 * Fuente única de los App Roles técnicos usados para filtrar navegación
 * (roleGuard en app.routes.ts, ModuleService). Espejo intencional de
 * maziapp-backend/src/config/roles.ts — el backend es siempre la
 * autoridad final de autorización; esto solo controla qué ve el usuario
 * en la UI (guard de Angular = UX, no seguridad real — ver
 * docs/SECURITY.md).
 *
 * Migración de roles (agosto 2026) — matriz oficial confirmada:
 *
 *   Freelance            -> ejecutivo_inversion
 *   Compliance           -> compliance
 *   Administración       -> administracion
 *   Dirección Comercial  -> direccion_comercial
 *   Gerencia General     -> gerencia_general
 *
 * `supervisor_inversion` es LEGACY y no forma parte del modelo final.
 * Se mantiene temporalmente solo en los reportes donde ya tenía acceso,
 * como red de seguridad de transición mientras el dueño del proyecto
 * crea y asigna los roles nuevos en Entra ID — ver la nota de migración
 * en maziapp-backend/src/config/roles.ts (mismo criterio en ambos lados).
 */
export const APP_ROLES = {
  FREELANCE: 'ejecutivo_inversion',
  COMPLIANCE: 'compliance',
  ADMINISTRACION: 'administracion',
  DIRECCION_COMERCIAL: 'direccion_comercial',
  GERENCIA_GENERAL: 'gerencia_general',
  /**
   * @deprecated LEGACY — pendiente de retiro. No usar en lógica nueva.
   */
  LEGACY_SUPERVISOR: 'supervisor_inversion',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

/**
 * Roles por módulo — cada módulo tiene su propia matriz independiente
 * (agosto 2026: se eliminó ROLES_FREELANCE, que agrupaba varios
 * módulos distintos bajo un solo nombre que ya no representaba
 * correctamente el modelo de autorización). Que un rol aparezca en la
 * matriz de un módulo NO implica acceso a ningún otro módulo — cada
 * constante se define y se lee de forma independiente.
 *
 * Contactos, KYC y Capacitaciones: sin cambios respecto al estado
 * anterior — exclusivo de Freelance, sin heredar del legacy (ver
 * Auditoria_MaziFlow_Migracion_Roles.docx, secciones 13-16: ningún rol
 * nuevo tiene un permiso confirmado sobre estos módulos).
 *
 * Comisiones: Freelance + Dirección Comercial (esta constante ya
 * existía con este mismo valor pero no estaba conectada a ningún
 * módulo real — ahora sí se usa).
 */
export const ROLES_CONTACTOS: AppRole[] = [APP_ROLES.FREELANCE];
export const ROLES_KYC: AppRole[] = [APP_ROLES.FREELANCE];
export const ROLES_COMISIONES: AppRole[] = [APP_ROLES.FREELANCE, APP_ROLES.DIRECCION_COMERCIAL];
export const ROLES_CAPACITACIONES: AppRole[] = [APP_ROLES.FREELANCE];

/**
 * Matriz de roles por reporte Power BI — decisión definitiva del dueño
 * del proyecto. Única fuente de verdad en el frontend: la usan tanto
 * ModuleService (qué tarjeta de reporte se muestra) como app.routes.ts
 * (roleGuard de cada ruta /reportes/*). Debe coincidir con
 * maziapp-backend/src/config/roles.ts::REPORTES_ROLES.
 */
export const REPORTES_ROLES: Record<string, AppRole[]> = {
  avance_ejecutivas: [APP_ROLES.DIRECCION_COMERCIAL, APP_ROLES.LEGACY_SUPERVISOR],
  funnel_conversion: [APP_ROLES.DIRECCION_COMERCIAL, APP_ROLES.LEGACY_SUPERVISOR],
  control_operaciones: [
    APP_ROLES.DIRECCION_COMERCIAL,
    APP_ROLES.GERENCIA_GENERAL,
    APP_ROLES.LEGACY_SUPERVISOR,
  ],
};

/**
 * Cualquier rol con acceso a al menos un reporte — se calcula a partir
 * de REPORTES_ROLES (no se duplica a mano) y se usa para la ruta
 * /reportes (índice) y para decidir si el módulo "Reportería" aparece
 * en el sidebar.
 */
export const ROLES_CON_ACCESO_A_REPORTES: AppRole[] = Array.from(
  new Set(Object.values(REPORTES_ROLES).flat()),
);
