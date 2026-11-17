import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { pendingChangesGuard } from './core/guards/pending-changes.guard';
import {
  ROLES_CONTACTOS,
  ROLES_KYC,
  ROLES_COMISIONES,
  ROLES_CAPACITACIONES,
  REPORTES_ROLES,
  ROLES_CON_ACCESO_A_REPORTES,
} from './core/auth/app-roles';

export const routes: Routes = [
  {
    // 🏠 Landing sin restricción de rol (ver home.component.ts): evita que
    // un usuario autenticado sin ninguno de los roles de negocio
    // vigentes (ver core/auth/app-roles.ts) quede sin ninguna página
    // accesible.
    path: '',
    canActivate: [authGuard],
    data: { title: 'Inicio' },
    loadComponent: () =>
      import('./features/home/pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'contactos',
    canActivate: [authGuard, roleGuard(ROLES_CONTACTOS)],
    data: { title: 'Contactos' },
    loadComponent: () =>
      import('./features/contactos/pages/contactos.component').then((m) => m.ContactosComponent),
  },
  {
    path: 'contactos/:id',
    canActivate: [authGuard, roleGuard(ROLES_CONTACTOS)],
    // 🔐 Fase "Patrón definitivo de guardado": advierte antes de
    // abandonar la Ficha Contacto (vía navegación real de Angular
    // Router -- cambiar de URL, volver atrás, ir a otro contacto,
    // etc.) si Cliente/Ubicación tienen cambios sin guardar. Ver
    // ContactoFichaComponent::canDeactivate() y
    // core/guards/pending-changes.guard.ts.
    canDeactivate: [pendingChangesGuard],
    data: { title: 'Ficha de contacto' },
    loadComponent: () =>
      import('./features/contactos/pages/contacto-ficha.component').then(
        (m) => m.ContactoFichaComponent,
      ),
  },
  {
    path: 'reportes',
    canActivate: [authGuard, roleGuard(ROLES_CON_ACCESO_A_REPORTES)],
    data: { title: 'Reportería' },
    loadComponent: () =>
      import('./features/reportes/pages/reportes-index/reportes-index.component').then(
        (m) => m.ReportesIndexComponent,
      ),
  },
  {
    path: 'reportes/avance_ejecutivas',
    canActivate: [authGuard, roleGuard(REPORTES_ROLES['avance_ejecutivas'])],
    data: { title: 'Avance ejecutivas' },
    loadComponent: () =>
      import('./features/reportes/pages/powerbi-view/powerbi-view.component').then(
        (m) => m.PowerbiViewComponent,
      ),
  },
  {
    path: 'reportes/funnel_conversion',
    canActivate: [authGuard, roleGuard(REPORTES_ROLES['funnel_conversion'])],
    data: { title: 'Funnel de conversión' },
    loadComponent: () =>
      import('./features/reportes/pages/powerbi-view/powerbi-view.component').then(
        (m) => m.PowerbiViewComponent,
      ),
  },
  {
    path: 'reportes/control_operaciones',
    canActivate: [authGuard, roleGuard(REPORTES_ROLES['control_operaciones'])],
    data: { title: 'Control de operaciones' },
    loadComponent: () =>
      import('./features/reportes/pages/powerbi-view/powerbi-view.component').then(
        (m) => m.PowerbiViewComponent,
      ),
  },
  // 🚧 Módulos preparados en el sidebar pero aún no implementados
  // (Etapa 8): muestran una página "Próximamente" en vez de una
  // funcionalidad real.
  {
    path: 'kyc',
    canActivate: [authGuard, roleGuard(ROLES_KYC)],
    data: { title: 'KYC' },
    loadComponent: () =>
      import('./layout/proximamente/proximamente.component').then((m) => m.ProximamenteComponent),
  },
  {
    path: 'comisiones',
    canActivate: [authGuard, roleGuard(ROLES_COMISIONES)],
    data: { title: 'Comisiones' },
    loadComponent: () =>
      import('./layout/proximamente/proximamente.component').then((m) => m.ProximamenteComponent),
  },
  {
    path: 'capacitaciones',
    canActivate: [authGuard, roleGuard(ROLES_CAPACITACIONES)],
    data: { title: 'Capacitaciones' },
    loadComponent: () =>
      import('./layout/proximamente/proximamente.component').then((m) => m.ProximamenteComponent),
  },
  {
    path: 'configuracion',
    canActivate: [authGuard],
    data: { title: 'Configuración' },
    loadComponent: () =>
      import('./layout/proximamente/proximamente.component').then((m) => m.ProximamenteComponent),
  },
];
