/**
 * Roles de negocio — Mazi Flow (backend)
 *
 * Catálogo técnico de los App Roles de Microsoft Entra ID conocidos por
 * el backend, usado para tipado y para las autorizaciones que SÍ siguen
 * viviendo en código (withAuth, contacto.service.ts). Cambiar quién
 * tiene cada código de rol en Entra ID no se hace aquí — este archivo
 * solo declara qué códigos existen y cómo se llaman.
 *
 * Migración de roles (agosto 2026) — matriz oficial confirmada por el
 * dueño del proyecto (ver Auditoria_MaziFlow_Migracion_Roles.docx):
 *
 *   Freelance            -> ejecutivo_inversion
 *   Compliance           -> compliance
 *   Administración       -> administracion
 *   Dirección Comercial  -> direccion_comercial
 *   Gerencia General     -> gerencia_general
 *
 * `supervisor_inversion` es LEGACY: no forma parte del modelo final de
 * autorización. Se mantiene temporalmente solo donde ya tenía acceso
 * funcional real y donde el dueño del proyecto pidió explícitamente
 * evitar un corte de acceso durante la transición. Retiro planificado
 * en 3 pasos (ver docs/AUTHENTICATION.md):
 *   1. El dueño del proyecto crea los 4 App Roles nuevos en Entra ID y
 *      los asigna a los usuarios reales.
 *   2. Se confirma en uso real que cada usuario migrado conserva acceso
 *      con su rol nuevo.
 *   3. Se retira LEGACY_SUPERVISOR de aquí (y de las filas
 *      correspondientes en dbo.ReporteRoles) y, después, el App Role
 *      se retira de Entra ID.
 *
 * IMPORTANTE (fase 2, agosto 2026): la matriz de autorización de
 * reportes Power BI (qué rol ve qué reporte) YA NO vive en este
 * archivo. Se movió a base de datos (dbo.Reportes, dbo.ReporteRoles —
 * ver database/schema_reportes_roles.sql y
 * database/seed_reportes_roles.sql) para poder administrarla sin
 * desplegar código. Ver repositories/reportes/reporteRol.repository.ts
 * y services/reportes/reporte.service.ts. Este archivo (APP_ROLES /
 * AppRole) sigue siendo la referencia de qué códigos de rol son
 * válidos para el resto del backend (por ejemplo,
 * CONTACTOS_ROLES_PERMITIDOS abajo).
 *
 * CORRECCIÓN DE ARQUITECTURA (fase 3, agosto 2026): la base de datos
 * NO cataloga App Roles de Entra ID — no existe (ni existió nunca como
 * diseño definitivo) una tabla `dbo.Roles`. Microsoft Entra ID es la
 * ÚNICA fuente de verdad de qué App Roles existen, a quién están
 * asignados, y qué trae el claim `roles` del JWT. `dbo.ReporteRoles`
 * guarda el código de rol como texto plano (`RoleCodigo`), sin FK
 * hacia ningún catálogo — ver reporteRol.repository.ts.
 */
export const APP_ROLES = {
  FREELANCE: "ejecutivo_inversion",
  COMPLIANCE: "compliance",
  ADMINISTRACION: "administracion",
  DIRECCION_COMERCIAL: "direccion_comercial",
  GERENCIA_GENERAL: "gerencia_general",
  /**
   * @deprecated LEGACY — pendiente de retiro. No usar en lógica nueva ni
   * como base de ningún permiso que no tuviera ya antes de esta
   * migración. Ver la nota de migración arriba.
   */
  LEGACY_SUPERVISOR: "supervisor_inversion",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

/**
 * Roles con acceso al módulo Contactos (crear y listar/consultar).
 *
 * Exclusivo de Freelance (regla confirmada, sin cambios en esta
 * migración: "la creación de Contactos continúa siendo exclusiva de
 * ejecutivo_inversion"). Ninguno de los 4 roles nuevos hereda acceso a
 * Contactos automáticamente — no hay, hoy, un requerimiento documentado
 * que respalde dárselo (ver Auditoria_MaziFlow_Migracion_Roles.docx,
 * secciones 13-16). LEGACY_SUPERVISOR se retira aquí de inmediato (no en
 * el período de transición): su antigua capacidad de "ver todos los
 * Contactos" no tiene un rol sucesor confirmado, así que no hay ninguna
 * capacidad real que preservar manteniéndolo en este array — ver
 * contacto.service.ts.
 *
 * Nota de alcance (fase 2): esta autorización es independiente de la de
 * Reportes (que ahora vive en dbo.ReporteRoles) — no se asume ningún
 * cambio aquí a partir de esa migración, tal como se pidió
 * explícitamente.
 */
export const CONTACTOS_ROLES_PERMITIDOS: AppRole[] = [APP_ROLES.FREELANCE];

/**
 * Roles con lectura del módulo Pipeline (S06), según
 * `docs/openapi.yaml` (`x-required-roles`):
 *
 *   GET  /pipeline/etapas
 *   GET  /pipeline/oportunidades
 *   GET  /pipeline/oportunidades/{id}
 *   GET  /pipeline/oportunidades/{id}/historial
 *
 * El freelance ve solo su cartera; Dirección Comercial y Gerencia
 * General ven todas las oportunidades. La restricción de cartera NO se
 * resuelve aquí: `withAuth` solo decide quién entra, y
 * `pipeline.service.ts` decide qué filas puede ver cada rol.
 */
export const PIPELINE_ROLES_LECTURA: AppRole[] = [
  APP_ROLES.FREELANCE,
  APP_ROLES.DIRECCION_COMERCIAL,
  APP_ROLES.GERENCIA_GENERAL,
];

/**
 * Roles con escritura en Pipeline (S06): alta, avance de etapa y paso a
 * perdida. Exclusivo de Freelance — Dirección Comercial y Gerencia
 * General tienen visibilidad, no operación.
 */
export const PIPELINE_ROLES_ESCRITURA: AppRole[] = [APP_ROLES.FREELANCE];
