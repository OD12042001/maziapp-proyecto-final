import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

/**
 * Guard genérico y reutilizable de "cambios sin guardar" -- Fase
 * "Patrón definitivo de guardado" (Cliente / Direcciones /
 * Representantes).
 *
 * No depende de ningún componente concreto: cualquier componente de
 * ruta que quiera protegerse contra una navegación que abandone
 * edición sin guardar solo necesita implementar
 * `ComponentWithPendingChanges` (un único método `canDeactivate()`) y
 * agregar `canDeactivate: [pendingChangesGuard]` en su definición de
 * ruta (ver `app.routes.ts`, ruta `contactos/:id`). No existía ningún
 * guard de este tipo en el proyecto antes de esta fase (verificado:
 * cero coincidencias de `CanDeactivate` en todo `src/`) -- este es el
 * único archivo nuevo de infraestructura de navegación que agrega
 * esta fase, y queda disponible para que otras rutas lo reutilicen
 * en el futuro sin duplicar lógica.
 *
 * Angular invoca `canDeactivate()` únicamente ante una navegación de
 * ROUTER real que abandona la ruta activa (cambiar de URL, volver
 * atrás, navegar a otro contacto, etc.) -- nunca ante un cambio de
 * pestaña dentro de `<fd-tab-list>` de Ficha Contacto, que es estado
 * interno del componente de tabs de Fundamental-ngx, no una
 * navegación de Angular Router (ver auditoría: `app.routes.ts` solo
 * define una ruta `contactos/:id` para TODAS las pestañas).
 */
export interface ComponentWithPendingChanges {
  /**
   * Debe devolver (o emitir) `true` si es seguro abandonar la ruta
   * (sin cambios pendientes, o el usuario confirmó salir sin
   * guardar), o `false` si la navegación debe cancelarse (el usuario
   * eligió seguir editando).
   */
  canDeactivate(): boolean | Observable<boolean>;
}

export const pendingChangesGuard: CanDeactivateFn<ComponentWithPendingChanges> = (component) =>
  component.canDeactivate();
