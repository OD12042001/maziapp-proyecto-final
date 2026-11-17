import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ROLES_KYC, ROLES_KYC_DICTAMEN } from '../../../core/auth/app-roles';
import { KycPageComponent } from './kyc-page.component';

describe('KycPageComponent (S12 / S13)', () => {
  const expedienteMock = {
    kycExpedienteId: 3,
    oportunidadId: 7,
    contactoId: 20,
    contactoNombre: 'Inversiones Andinas S.A.C.',
    estado: 'EN_PROCESO' as const,
    fechaInicioUtc: '2026-11-16T10:00:00.000Z',
    fechaDictamenUtc: null,
    dictamenUsuarioId: null,
    dictamenUsuarioNombre: null,
    observacion: null,
    sla: {
      diasTranscurridos: 2,
      umbralDias: 15,
      vencido: false,
      fechaCorteUtc: '2026-11-18T10:00:00.000Z',
    },
    documentos: [
      {
        kycDocumentoId: 11,
        documentoRequeridoId: 1,
        codigo: 'DOC_IDENTIDAD',
        nombre: 'Documento de identidad',
        obligatorio: true,
        estado: 'RECIBIDO' as const,
        archivoReferencia: 'https://docs.local/dni.pdf',
        fechaRecepcionUtc: '2026-11-16T10:05:00.000Z',
        fechaRevisionUtc: null,
        revisadoPorId: null,
        revisadoPorNombre: null,
        observacion: null,
      },
    ],
  };

  function crearSetup(roles: string[]) {
    const kycService = {
      listarExpedientes: vi.fn(() =>
        of({ items: [expedienteMock], page: 1, pageSize: 20, total: 1 }),
      ),
      obtenerExpediente: vi.fn(() => of(expedienteMock)),
      crearExpediente: vi.fn(() => of(expedienteMock)),
      registrarRecepcion: vi.fn(() => of(expedienteMock.documentos[0])),
      revisarDocumento: vi.fn(() =>
        of({ ...expedienteMock.documentos[0], estado: 'VALIDADO' as const }),
      ),
      dictaminar: vi.fn(() =>
        of({ ...expedienteMock, estado: 'VALIDADO' as const }),
      ),
    };

    const authService = {
      getRoles: vi.fn(async () => roles),
    };

    const component = new KycPageComponent(
      kycService as any,
      authService as any,
    );

    return { component, kycService, authService };
  }

  it('alinea la matriz de roles KYC: acceso para freelance y compliance, dictamen exclusivo de compliance', () => {
    expect(ROLES_KYC).toEqual(['ejecutivo_inversion', 'compliance']);
    expect(ROLES_KYC_DICTAMEN).toEqual(['compliance']);
  });

  it('deshabilita el dictamen para ejecutivo_inversion y lo habilita para compliance', async () => {
    const setupFreelance = crearSetup(['ejecutivo_inversion']);
    await setupFreelance.component.ngOnInit();
    expect(setupFreelance.component.puedeDictaminar()).toBe(false);
    expect(setupFreelance.component.expedientes()).toHaveLength(1);

    const setupCompliance = crearSetup(['compliance']);
    await setupCompliance.component.ngOnInit();
    expect(setupCompliance.component.puedeDictaminar()).toBe(true);
  });

  it('permite seleccionar expediente, cargar documento y emitir dictamen final', async () => {
    const { component, kycService } = crearSetup(['compliance']);
    await component.ngOnInit();

    component.seleccionarExpediente(3);
    expect(component.detalle()?.kycExpedienteId).toBe(3);

    component.cargarDocumento(3, expedienteMock.documentos[0]);
    expect(kycService.registrarRecepcion).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ documentoRequeridoCodigo: 'DOC_IDENTIDAD' }),
    );

    component.emitirDictamen(3, 'VALIDADO');
    expect(kycService.dictaminar).toHaveBeenCalledWith(
      3,
      expect.objectContaining({ estado: 'VALIDADO' }),
    );
    expect(component.detalle()?.estado).toBe('VALIDADO');
  });
});
