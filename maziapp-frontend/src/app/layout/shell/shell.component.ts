import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs/operators';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent, RouterOutlet],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  // 🔑 Única fuente de verdad para el estado del drawer de navegación.
  // TopbarComponent lo abre/cierra con el botón ☰ (menuToggle) y
  // SidebarComponent lo refleja (isOpen) y lo cierra a sí mismo cuando
  // corresponde (closed): overlay, botón ✕, Escape o selección de módulo.
  isMenuOpen = false;

  // 🧭 Breadcrumb: vive acá (área de contenido) y NO en TopbarComponent —
  // la barra superior es únicamente navegación/global (☰, marca,
  // notificaciones, usuario). Misma lógica que antes tenía TopbarComponent,
  // solo reubicada: una única fuente para todos los módulos, sin duplicar
  // nada por página (ver app.routes.ts → data.title de cada ruta).
  seccion = 'Plataforma Comercial';
  pagina = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.actualizarBreadcrumb();

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.actualizarBreadcrumb();
    });
  }

  private actualizarBreadcrumb(): void {
    let current = this.route.root;

    while (current.firstChild) {
      current = current.firstChild;
    }

    this.pagina = current.snapshot.data['title'] || '';
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }
}
