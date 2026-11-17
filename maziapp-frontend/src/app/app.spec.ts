import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { InteractionStatus } from '@azure/msal-browser';

import { App } from './app';
import { ShellComponent } from './layout/shell/shell.component';
import { SessionService } from './core/services/session.service';

/**
 * Este es el único spec del proyecto que usa TestBed (scaffold original
 * de Angular CLI, nunca migrado al patrón manual `new Component(...)`
 * usado en el resto del proyecto -- ver contacto-modal.component.spec.ts
 * y similares). Se mantiene TestBed aquí (cambio mínimo, sin reescribir
 * el archivo al patrón manual) pero se agregan los providers que
 * faltaban: `App` inyecta MsalService/MsalBroadcastService/
 * SessionService (además de LoadingService, que sí se resuelve solo --
 * providedIn:'root', sin dependencias propias) y ninguno de los tres
 * primeros estaba provisto, lo que producía
 * `NG0201: No provider found for MsalService` al construir el
 * componente (Angular resuelve el árbol de constructores completo, no
 * solo el de App, apenas se llama TestBed.createComponent -- incluye a
 * ShellComponent, hijo directo en app.html).
 *
 * Para no arrastrar también las dependencias propias de ShellComponent
 * (Router/ActivatedRoute) y las de SUS hijos reales
 * (TopbarComponent/SidebarComponent -> AuthService/DialogService/etc,
 * fuera del alcance de este test), se reemplaza el template de
 * ShellComponent por uno vacío vía `TestBed.overrideComponent` --
 * `<app-shell>` como ETIQUETA sigue viniendo de app.html (así que la
 * aserción "should render the app shell" se sigue cumpliendo igual),
 * solo se evita instanciar lo que hay DENTRO de ese componente.
 * Router/ActivatedRoute (que ShellComponent sí necesita para sí mismo)
 * se resuelven con `provideRouter([])`, la forma estándar de Angular
 * para tests que no necesitan navegación real.
 */
describe('App', () => {
  const msalServiceStub = {
    instance: {
      getAllAccounts: () => [],
      setActiveAccount: () => {},
    },
  } as unknown as MsalService;

  const msalBroadcastServiceStub = {
    inProgress$: of(InteractionStatus.None),
  } as unknown as MsalBroadcastService;

  const sessionServiceStub = {
    loadSession: async () => {},
    user$: of(null),
    roles$: of([]),
    photo$: of(null),
    modules$: of([]),
    loading$: of(false),
  } as unknown as SessionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: MsalService, useValue: msalServiceStub },
        { provide: MsalBroadcastService, useValue: msalBroadcastServiceStub },
        { provide: SessionService, useValue: sessionServiceStub },
      ],
    })
      .overrideComponent(ShellComponent, { set: { template: '<div class="stub-shell"></div>' } })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the app shell', async () => {
    // Nota: el scaffold original de Angular CLI dejó aquí una aserción
    // sobre un <h1> "Hello, maziapp" que nunca existió en app.html (el
    // layout real siempre fue header/shell + router-outlet). Se corrige
    // para verificar el shell real en vez de un texto que nunca se
    // renderizaba.
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-shell')).toBeTruthy();
  });
});
