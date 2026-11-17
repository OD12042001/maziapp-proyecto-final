import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MsalService, MsalBroadcastService } from '@azure/msal-angular';

import { InteractionStatus } from '@azure/msal-browser';

import { filter } from 'rxjs/operators';

import { ShellComponent } from './layout/shell/shell.component';

import { LoadingService } from './core/services/loading.service';

import { SessionService } from './core/services/session.service';

import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShellComponent, CommonModule],
  templateUrl: './app.html',
})
export class App implements OnInit {
  loading$;

  constructor(
    private msal: MsalService,

    private msalBroadcast: MsalBroadcastService,

    private loadingService: LoadingService,

    private session: SessionService,
  ) {
    this.loading$ = this.loadingService.loading$;
  }

  async ngOnInit(): Promise<void> {
    // 🔐 Desarrollo local sin Entra ID: cargar la sesión sintética
    // directamente, sin esperar eventos de MSAL.
    if (environment.useMockAuth) {
      await this.session.loadSession();

      return;
    }

    this.msalBroadcast.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(async () => {
        const accounts = this.msal.instance.getAllAccounts();

        if (accounts.length > 0) {
          this.msal.instance.setActiveAccount(accounts[0]);

          await this.session.loadSession();
        }
      });
  }
}
