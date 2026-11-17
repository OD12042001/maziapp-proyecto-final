import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import {
  ROLES_COMISIONES,
  ROLES_COMISIONES_REVERSION,
} from '../../../core/auth/app-roles';
import { ComisionesPageComponent } from './comisiones-page.component';

describe('ComisionesPageComponent (S15 / S16 / S17)', () => {
  const cierreMock = {
    cierreId: 10,
    oportunidadId: 7,
    proyecto: {
      proyectoId: 1,
      codigo: 'PRY-001',
      nombre: 'Expansión retail',
      descripcion: null,
      monedaCodigo: 'PEN' as const,
      montoObjetivo: 5000000,
      activo: true,
    },
    montoCaptado: 200000,
    monedaCodigo: 'PEN' as const,
    fechaCierreUtc: '2026-11-16T15:00:00.000Z',
    freelanceId: '11111111-1111-1111-1111-111111111111',
    estado: 'REGISTRADO' as const,
    comisionId: 4,
    comisionEstado: 'PENDIENTE' as const,
  };

  const comisionMock = {
    comisionId: 4,
    cierreId: 10,
    oportunidadId: 7,
    proyectoNombre: 'Expansión retail',
    freelanceId: '11111111-1111-1111-1111-111111111111',
    monedaCodigo: 'PEN' as const,
    montoCaptado: 200000,
    tasaPorcentaje: 3,
    porcentajeIgv: 18,
    importeTotal: 6000,
    baseImponible: 5084.75,
    importeIgv: 915.25,
    estado: 'PENDIENTE' as const,
    fechaCalculoUtc: '2026-11-16T15:05:00.000Z',
    reversion: null,
  };

  function crearSetup(roles: string[]) {
    const comisionesService = {
      listarCierres: vi.fn(() =>
        of({ items: [cierreMock], page: 1, pageSize: 20, total: 1 }),
      ),
      registrarCierre: vi.fn(() => of(cierreMock)),
      listarComisiones: vi.fn(() =>
        of({ items: [comisionMock], page: 1, pageSize: 20, total: 1 }),
      ),
      revertirComision: vi.fn(() =>
        of({ ...comisionMock, estado: 'REVERTIDA' as const }),
      ),
      procesarOutbox: vi.fn(() =>
        of({ procesados: 2, publicados: 2, fallidos: 0, muertos: 0 }),
      ),
    };

    const authService = {
      getRoles: vi.fn(async () => roles),
    };

    const component = new ComisionesPageComponent(
      comisionesService as any,
      authService as any,
    );

    return { component, comisionesService, authService };
  }

  it('declara los roles de lectura y reversión de comisiones alineados con el backend', () => {
    expect(ROLES_COMISIONES).toEqual([
      'ejecutivo_inversion',
      'direccion_comercial',
      'administracion',
      'gerencia_general',
    ]);
    expect(ROLES_COMISIONES_REVERSION).toEqual([
      'administracion',
      'compliance',
    ]);
  });

  it('carga cierres y comisiones (3 % incluido IGV) y habilita reversión solo a administración/compliance', async () => {
    const setupFreelance = crearSetup(['ejecutivo_inversion']);
    await setupFreelance.component.ngOnInit();
    expect(setupFreelance.component.puedeRevertir()).toBe(false);
    expect(setupFreelance.component.cierres()).toHaveLength(1);
    expect(setupFreelance.component.comisiones()[0].importeTotal).toBe(6000);

    const setupAdmin = crearSetup(['administracion']);
    await setupAdmin.component.ngOnInit();
    expect(setupAdmin.component.puedeRevertir()).toBe(true);
  });

  it('registra cierre idempotente, despacha outbox ESB y revierte comisión pendiente', async () => {
    const { component, comisionesService } = crearSetup(['administracion']);
    await component.ngOnInit();

    component.registrarCierre();
    expect(comisionesService.registrarCierre).toHaveBeenCalledTimes(1);

    component.despacharOutbox();
    expect(comisionesService.procesarOutbox).toHaveBeenCalledWith(50);

    component.revertir(comisionMock);
    expect(comisionesService.revertirComision).toHaveBeenCalledWith(
      4,
      expect.objectContaining({ motivoCodigo: 'DESEMBOLSO_NO_CONCRETADO' }),
      expect.stringContaining('idem-rev-4'),
    );
  });
});
