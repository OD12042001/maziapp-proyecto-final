import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DialogRef, DialogModule } from '@fundamental-ngx/core/dialog';
import { ButtonModule } from '@fundamental-ngx/core/button';

/**
 * Diálogo de confirmación GENÉRICO -- Fase "Patrón definitivo de
 * guardado" (Cliente / Direcciones / Representantes).
 *
 * Contexto (ver auditoría entregada antes de esta implementación): el
 * proyecto NO tenía, hasta esta fase, ningún componente de diálogo de
 * confirmación reutilizable -- solo `window.confirm()` (usado hoy en
 * `contacto-direcciones.component.ts` / `contacto-representantes.
 * component.ts` para confirmar una desactivación) y `DialogService`
 * de Fundamental-ngx (usado hoy únicamente para abrir los modales
 * completos de Crear/Editar Dirección/Representante, nunca para una
 * confirmación simple sí/no).
 *
 * `window.confirm()` no permite personalizar el texto de sus botones
 * (siempre "Aceptar"/"Cancelar" u "OK"/"Cancel" según el navegador),
 * así que no puede producir los textos exactos requeridos para el
 * caso "cambios sin guardar" ("Seguir editando" / "Salir sin
 * guardar"). Por eso, siguiendo la instrucción explícita de proponer
 * la solución mínima compatible cuando no exista un mecanismo
 * apropiado: este componente NO introduce ninguna librería nueva --
 * se abre exactamente igual que los modales de Crear/Editar
 * (`DialogService.open(ConfirmDialogComponent, { data })`, mismo
 * `DialogRef`/`DialogModule` ya usados en el proyecto), reutilizando
 * la infraestructura de diálogos existente. Es intencionalmente
 * genérico (título/mensaje/textos de botón configurables por `data`)
 * para que cualquier otro caso futuro que necesite una confirmación
 * con textos específicos pueda reutilizarlo sin crear un componente
 * nuevo cada vez.
 */
export interface ConfirmDialogData {
  /** Título del diálogo. Por defecto: "Confirmar". */
  title?: string;

  /** Mensaje principal, mostrado en el cuerpo del diálogo. */
  message: string;

  /** Texto del botón que CANCELA la acción (cierra con `false`). */
  cancelText?: string;

  /** Texto del botón que CONFIRMA la acción (cierra con `true`). */
  confirmText?: string;
}

@Component({
  selector: 'app-confirm-dialog',

  standalone: true,

  imports: [CommonModule, DialogModule, ButtonModule],

  templateUrl: './confirm-dialog.component.html',

  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent {
  constructor(public dialogRef: DialogRef<ConfirmDialogData>) {}

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}
