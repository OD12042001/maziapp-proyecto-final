import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';

import { filter } from 'rxjs/operators';

import { AvatarModule } from '@fundamental-ngx/core/avatar';
import { ButtonModule } from '@fundamental-ngx/core/button';
import { IconModule } from '@fundamental-ngx/core/icon';
import { PopoverModule } from '@fundamental-ngx/core/popover';
import { DialogService } from '@fundamental-ngx/core/dialog';

import { SessionService } from '../../core/services/session.service';
import { AuthService } from '../../core/auth/auth.service';
import { ContactoModalComponent } from '../../features/contactos/components/contacto-modal.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, AvatarModule, ButtonModule, IconModule, PopoverModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
})
export class TopbarComponent implements OnInit {
  // 🍔 Estado del drawer de navegación: NO es dueño del estado (única fuente
  // de verdad = ShellComponent.isMenuOpen), solo lo refleja para pintar el
  // botón ☰ (aria-expanded) y pide abrirlo/cerrarlo emitiendo menuToggle.
  @Input() isMenuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  showAddButton = false;

  userName = 'Usuario';
  userEmail = '';
  userRole = '';
  userPhoto: string | null = null;
  photoReady = false;
  userInitials = '';

  constructor(
    private router: Router,
    private auth: AuthService,
    private session: SessionService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: any) => {
      this.showAddButton = event.url.includes('/contactos') && !event.url.includes('/contactos/');
    });

    this.session.user$.subscribe((user) => {
      if (!user) return;

      const claims: any = user.idTokenClaims || {};

      const email = claims.preferred_username || claims.email || user.username || '';

      const name = claims.name || email.split('@')[0];

      queueMicrotask(() => {
        this.userName = name;
        this.userEmail = email;
        this.userInitials = this.getInitials(name);
        this.cdr.markForCheck();
      });
    });

    this.session.photo$.subscribe((photo) => {
      if (!photo) return;

      queueMicrotask(() => {
        this.userPhoto = photo;
        this.photoReady = true;
        this.cdr.markForCheck();
      });
    });

    this.session.roles$.subscribe((roles) => {
      queueMicrotask(() => {
        this.userRole = roles.length > 0 ? roles[0] : 'Sin rol';
        this.cdr.markForCheck();
      });
    });
  }

  abrirNuevoContacto() {
    this.dialogService.open(ContactoModalComponent, {
      responsivePadding: true,
    });
  }

  logout() {
    this.auth.logout();
  }

  getInitials(name: string): string {
    if (!name) return '';

    const parts = name
      .trim()
      .split(' ')
      .filter((p) => p.length > 0);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    const first = parts[0];
    const last = parts[parts.length - 1];

    return (first[0] + last[0]).toUpperCase();
  }
}
