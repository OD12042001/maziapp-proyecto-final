import { Injectable } from '@angular/core';
import {
  ROLES_CONTACTOS,
  ROLES_KYC,
  ROLES_COMISIONES,
  ROLES_CAPACITACIONES,
  REPORTES_ROLES,
  ROLES_CON_ACCESO_A_REPORTES,
} from '../auth/app-roles';

export interface AppModule {
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  roles?: string[];
  /** Módulo aún no construido (Etapa 8): navega a una página "Próximamente". */
  proximamente?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ModuleService {
  // 🔥 MEJORA: en el proyecto original "Prospectos" apuntaba a una ruta
  // que no existía (/prospectos), quedando como un enlace roto en el
  // menú. Aquí el listado de módulos coincide exactamente con las rutas
  // reales registradas en app.routes.ts.
  // Migración de roles (agosto 2026): los arrays `roles` de abajo ya no
  // se declaran como literales — vienen de core/auth/app-roles.ts, la
  // única fuente de verdad. Cada módulo tiene su propia constante
  // independiente (ROLES_CONTACTOS, ROLES_KYC, ROLES_COMISIONES,
  // ROLES_CAPACITACIONES). Contactos/KYC/Capacitaciones siguen siendo
  // exclusivos de Freelance, sin cambios (ver
  // Auditoria_MaziFlow_Migracion_Roles.docx, secciones 13-16); Comisiones
  // además incluye Dirección Comercial. Reportería usa
  // ROLES_CON_ACCESO_A_REPORTES (hoy: Dirección Comercial + Gerencia
  // General + supervisor_inversion legacy temporal).
  private mainModules: AppModule[] = [
    {
      title: 'KYC',
      subtitle: 'Módulo de KYC',
      icon: 'validate',
      route: '/kyc',
      roles: ROLES_KYC,
      proximamente: true,
    },
    {
      title: 'Contactos',
      subtitle: 'Módulo de contactos',
      icon: 'contacts',
      route: '/contactos',
      roles: ROLES_CONTACTOS,
    },
    {
      title: 'Comisiones',
      subtitle: 'Módulo de comisiones',
      icon: 'money-bills',
      route: '/comisiones',
      roles: ROLES_COMISIONES,
      proximamente: true,
    },
    {
      title: 'Reportería',
      subtitle: 'Reportes',
      icon: 'business-objects-experience',
      route: '/reportes',
      roles: ROLES_CON_ACCESO_A_REPORTES,
    },
    {
      title: 'Capacitaciones',
      subtitle: 'Módulo de capacitaciones',
      icon: 'course-book',
      route: '/capacitaciones',
      roles: ROLES_CAPACITACIONES,
      proximamente: true,
    },
  ];

  // Decisión definitiva del dueño del proyecto (no inferencia):
  // avance_ejecutivas y funnel_conversion -> Dirección Comercial;
  // control_operaciones -> Dirección Comercial + Gerencia General.
  // avance_ejecutivas muestra información de TODOS los ejecutivos, no es
  // una vista individual — por eso ya no incluye a ejecutivo_inversion.
  private reportModules: AppModule[] = [
    {
      title: 'Avance ejecutivas',
      subtitle: 'Power BI',
      icon: 'line-chart',
      route: '/reportes/avance_ejecutivas',
      roles: REPORTES_ROLES['avance_ejecutivas'],
    },
    {
      title: 'Funnel conversión',
      subtitle: 'Power BI',
      icon: 'bar-chart',
      route: '/reportes/funnel_conversion',
      roles: REPORTES_ROLES['funnel_conversion'],
    },
    {
      title: 'Control de operaciones',
      subtitle: 'Power BI',
      icon: 'settings',
      route: '/reportes/control_operaciones',
      roles: REPORTES_ROLES['control_operaciones'],
    },
  ];

  getMainModules() {
    return this.mainModules;
  }

  getReportModules() {
    return this.reportModules;
  }
}
