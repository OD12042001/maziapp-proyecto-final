import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

import { IconModule } from '@fundamental-ngx/core/icon';

import { SessionService } from '../../core/services/session.service';
import { AppModule } from '../../core/services/module.service';

/**
 * Drawer de navegación (antes: sidebar siempre visible). El estado de
 * apertura NO se maneja acá — vive en ShellComponent (única fuente de
 * verdad, `isMenuOpen`) y llega como @Input `isOpen`. Este componente solo
 * pide cerrarse (@Output `closed`) ante cualquier interacción que deba
 * cerrar el drawer: overlay, botón ✕, Escape o selección de un módulo.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, IconModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  modules: AppModule[] = [];

  constructor(
    private session: SessionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.session.modules$.subscribe((modules) => {
      this.modules = modules;
    });
  }

  irAConfiguracion() {
    this.router.navigate(['/configuracion']);
    this.close();
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }
}
