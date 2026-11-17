import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IconModule } from '@fundamental-ngx/core/icon';

/**
 * Página de reserva para los módulos que la Etapa 8 pide NO implementar
 * todavía (KYC, Comisiones, Capacitaciones). Deja visible la navegación
 * completa del sidebar sin construir lógica de negocio que aún no toca.
 */
@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [IconModule],
  templateUrl: './proximamente.component.html',
  styleUrls: ['./proximamente.component.scss'],
})
export class ProximamenteComponent {
  titulo: string;

  constructor(private route: ActivatedRoute) {
    this.titulo = this.route.snapshot.data['title'] || 'Este módulo';
  }
}
