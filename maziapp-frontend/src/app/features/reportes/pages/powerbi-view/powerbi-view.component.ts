import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { ActivatedRoute } from '@angular/router';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ReportesService } from '../../../../core/services/reportes.service';

@Component({
  selector: 'app-powerbi-view',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './powerbi-view.component.html',

  styleUrls: ['./powerbi-view.component.scss'],
})
export class PowerbiViewComponent implements OnInit {
  safeUrl: SafeResourceUrl | null = null;

  error = false;

  constructor(
    private route: ActivatedRoute,

    private sanitizer: DomSanitizer,

    private reportesService: ReportesService,
  ) {}

  ngOnInit(): void {
    // 🔥 OBTENER RUTA ACTUAL
    const currentRoute = this.route.snapshot.routeConfig?.path || '';

    // 🔥 EXTRAER NOMBRE REPORTE
    const reportKey = currentRoute.split('/').pop() || '';

    // 🔐 MEJORA (auditoría #2 - ALTO): la URL del reporte ya no vive en
    // el frontend; se le pide al backend, que valida el rol del usuario
    // antes de entregarla.
    this.reportesService.obtenerEmbed(reportKey).subscribe({
      next: ({ url }) => {
        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
          `${url}&navContentPaneEnabled=false&filterPaneEnabled=false`,
        );
      },

      error: (err) => {
        console.error('Reporte no disponible', err);

        this.error = true;
      },
    });
  }
}
