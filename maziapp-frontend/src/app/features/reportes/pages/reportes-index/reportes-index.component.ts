import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { DynamicPageModule } from '@fundamental-ngx/core/dynamic-page';

import { ModuleService, AppModule } from '../../../../core/services/module.service';
import { ModuleCardComponent } from '../../../../shared/components/module-card/module-card.component';
import { SessionService } from '../../../../core/services/session.service';

/**
 * Índice de reportes: reemplaza al home de tarjetas original como punto
 * de entrada al módulo "Reportería" del sidebar. Reutiliza el mismo
 * ModuleCardComponent y el mismo filtrado por rol que ya existía.
 */
@Component({
  selector: 'app-reportes-index',
  standalone: true,
  imports: [CommonModule, DynamicPageModule, ModuleCardComponent],
  templateUrl: './reportes-index.component.html',
  styleUrls: ['./reportes-index.component.scss'],
})
export class ReportesIndexComponent implements OnInit {
  filteredModules: AppModule[] = [];

  constructor(
    private moduleService: ModuleService,
    private session: SessionService,
  ) {}

  ngOnInit(): void {
    const reportModules = this.moduleService.getReportModules();

    this.session.roles$.subscribe((roles) => {
      const normalizedRoles = roles.map((r) => r.toLowerCase());

      this.filteredModules = reportModules.filter(
        (m) => !m.roles || m.roles.some((role) => normalizedRoles.includes(role.toLowerCase())),
      );
    });
  }
}
