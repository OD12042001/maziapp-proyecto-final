import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { SessionService } from '../../../../core/services/session.service';
import { AppModule } from '../../../../core/services/module.service';

import { ModuleCardComponent } from '../../../../shared/components/module-card/module-card.component';

// SAP
import { DynamicPageModule } from '@fundamental-ngx/core/dynamic-page';
import { TileModule } from '@fundamental-ngx/core/tile';
import { IconModule } from '@fundamental-ngx/core/icon';

/**
 * Landing "Inicio": única página que cualquier usuario autenticado puede
 * ver sin importar su rol (evita el riesgo de un guard de rol en la ruta
 * raíz, que dejaría sin acceso — y en un loop de redirección — a un
 * usuario sin ninguno de los roles de negocio vigentes, ver
 * core/auth/app-roles.ts). Muestra los módulos a los que sí tiene
 * acceso, reutilizando el mismo listado filtrado que ya usa el sidebar
 * (SessionService.modules$).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, DynamicPageModule, TileModule, IconModule, ModuleCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  filteredModules: AppModule[] = [];

  constructor(
    private router: Router,
    private session: SessionService,
  ) {}

  ngOnInit() {
    this.session.modules$.subscribe((modules) => {
      this.filteredModules = modules;
    });
  }

  go(route: string) {
    this.router.navigate([route]);
  }
}
