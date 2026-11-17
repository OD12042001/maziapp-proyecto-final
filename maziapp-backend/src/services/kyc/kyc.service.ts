import * as repository from "../../repositories/kyc/kyc.repository";
import * as configuracion from "../../repositories/configuracion/configuracion.repository";
import { APP_ROLES } from "../../config/roles";
import { AuthenticatedUser } from "../../types/authenticated-user";
import {
  CrearExpedienteInput,
  DictamenInput,
  ListarExpedientesQuery,
  RegistrarRecepcionInput,
  RevisarDocumentoInput,
} from "../../validators/kyc.validator";

/**
 * Servicio de KYC (S12/S13).
 *
 * Reglas de negocio que no se pueden expresar en Zod porque dependen de
 * datos persistidos:
 * - compliance ve todos los expedientes; el freelance solo los de su
 *   cartera (anti-enumeración: lo no visible es `null`, nunca 403);
 * - un expediente por oportunidad y solo para oportunidades ACTIVAS;
 * - el checklist nace del catálogo activo, dentro de la transacción;
 * - la recepción documental es del freelance asignado; validar o
 *   rechazar un documento y emitir el dictamen es exclusivo de
 *   compliance;
 * - un dictamen VALIDADO exige todos los obligatorios VALIDADOS;
 * - el dictamen es final y siempre queda con fecha (CHECK de la base);
 * - el SLA se calcula con `KYC_SLA_DIAS` y se congela en la fecha de
 *   dictamen. Si el parámetro falta, la consulta falla: no se inventa un
 *   umbral.
 */

export { KycExpedienteDuplicadoError } from "../../repositories/kyc/kyc.repository";

export class KycOportunidadNoActivaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycOportunidadNoActivaError";
  }
}

export class KycEstadoNoPermitidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycEstadoNoPermitidoError";
  }
}

export class KycDictamenIncompletoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycDictamenIncompletoError";
  }
}

export class KycSlaNoConfiguradoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycSlaNoConfiguradoError";
  }
}

/**
 * Acción reservada a compliance. `withAuth` deja entrar al freelance
 * porque comparte la ruta con la carga documental; el límite fino se
 * aplica acá.
 */
export class KycAccionReservadaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KycAccionReservadaError";
  }
}

const CLAVE_SLA_KYC = "KYC_SLA_DIAS";

const DIA_MS = 24 * 60 * 60 * 1000;

function esCompliance(user: AuthenticatedUser): boolean {
  const roles = (user?.roles || []).map((rol) => rol.toLowerCase());

  return roles.includes(APP_ROLES.COMPLIANCE.toLowerCase());
}

/**
 * Compliance opera sobre cualquier cartera; el resto solo sobre la
 * propia. Los GUID llegan de SQL en mayúsculas y el claim `oid` en
 * minúsculas: se normaliza antes de comparar (misma corrección que
 * Pipeline y Contactos).
 */
function esVisible(
  expediente: { responsableId: string },
  user: AuthenticatedUser,
): boolean {
  if (esCompliance(user)) {
    return true;
  }

  const responsableId = expediente.responsableId?.toLowerCase();
  const usuarioOid = user?.oid?.toLowerCase();

  return !!responsableId && responsableId === usuarioOid;
}

function aEnteroPositivo(value: string | number): number | null {
  const n = Number(value);

  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }

  return n;
}

function expedienteFinal(estado: string): boolean {
  return estado === "VALIDADO" || estado === "RECHAZADO";
}

export interface SlaKyc {
  diasTranscurridos: number;
  umbralDias: number;
  vencido: boolean;
  fechaCorteUtc: string;
}

/**
 * Días completos entre el inicio del expediente y el corte. El corte es
 * la fecha de dictamen si existe: un expediente cerrado no sigue
 * envejeciendo. `vencido` compara contra el umbral vigente.
 */
function calcularSla(
  expediente: repository.ExpedienteKyc,
  umbralDias: number,
): SlaKyc {
  const corte = expediente.fechaDictamenUtc
    ? new Date(expediente.fechaDictamenUtc)
    : new Date();

  const inicio = expediente.fechaInicioUtc
    ? new Date(expediente.fechaInicioUtc)
    : corte;

  const diasTranscurridos = Math.max(
    0,
    Math.floor((corte.getTime() - inicio.getTime()) / DIA_MS),
  );

  return {
    diasTranscurridos,
    umbralDias,
    vencido: diasTranscurridos > umbralDias,
    fechaCorteUtc: corte.toISOString(),
  };
}

async function umbralSla(): Promise<number> {
  const umbral = await configuracion.findParametroEntero(CLAVE_SLA_KYC);

  if (umbral === null) {
    throw new KycSlaNoConfiguradoError(
      "El parámetro KYC_SLA_DIAS no está configurado como entero activo",
    );
  }

  return umbral;
}

/**
 * Forma HTTP del expediente: `responsableId` es un dato interno de
 * visibilidad y no forma parte del contrato.
 */
function aRespuesta(
  expediente: repository.ExpedienteKycDetalle,
  sla: SlaKyc,
) {
  const { responsableId, ...resto } = expediente;

  return { ...resto, sla };
}

async function cargarVisible(
  kycExpedienteId: number,
  user: AuthenticatedUser,
): Promise<repository.ExpedienteKycDetalle | null> {
  const expediente = await repository.findExpedienteById(kycExpedienteId);

  if (!expediente || !esVisible(expediente, user)) {
    return null;
  }

  const documentos = await repository.findDocumentosByExpediente(
    expediente.kycExpedienteId,
  );

  return { ...expediente, documentos };
}

// ---------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------

export async function listarDocumentosRequeridos() {
  return repository.findDocumentosRequeridos();
}

// ---------------------------------------------------------------------
// Expedientes
// ---------------------------------------------------------------------

export async function listarExpedientes(
  user: AuthenticatedUser,
  filtros: ListarExpedientesQuery,
) {
  const page = filtros.page ?? 1;
  const pageSize = filtros.pageSize ?? 20;
  const umbral = await umbralSla();

  const resultado = await repository.findExpedientes({
    estado: filtros.estado,
    contactoId: filtros.contactoId,
    oportunidadId: filtros.oportunidadId,
    responsableId: esCompliance(user) ? undefined : user.oid,
    page,
    pageSize,
  });

  return {
    items: resultado.items.map((expediente) => {
      const { responsableId, ...resto } = expediente;

      return { ...resto, sla: calcularSla(expediente, umbral) };
    }),
    page,
    pageSize,
    total: resultado.total,
  };
}

export async function crearExpediente(
  input: CrearExpedienteInput,
  user: AuthenticatedUser,
) {
  const oportunidad = await repository.findOportunidadParaKyc(
    input.oportunidadId,
  );

  if (!oportunidad || !esVisible(oportunidad, user)) {
    return null;
  }

  if (oportunidad.estado !== "ACTIVA") {
    throw new KycOportunidadNoActivaError(
      "La oportunidad ya está cerrada y no admite un expediente KYC",
    );
  }

  const existente = await repository.findExpedienteByOportunidad(
    input.oportunidadId,
  );

  if (existente) {
    throw new repository.KycExpedienteDuplicadoError(
      "La oportunidad ya tiene un expediente KYC",
    );
  }

  const expediente = await repository.saveExpediente({
    oportunidadId: oportunidad.oportunidadId,
    contactoId: oportunidad.contactoId,
    creadoId: user.oid,
    creadoNombre: user?.name || "",
  });

  const documentos = await repository.findDocumentosByExpediente(
    expediente.kycExpedienteId,
  );

  return aRespuesta(
    { ...expediente, documentos },
    calcularSla(expediente, await umbralSla()),
  );
}

export async function obtenerExpediente(
  kycExpedienteId: string | number,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(kycExpedienteId);

  if (id === null) {
    return null;
  }

  const expediente = await cargarVisible(id, user);

  if (!expediente) {
    return null;
  }

  return aRespuesta(expediente, calcularSla(expediente, await umbralSla()));
}

// ---------------------------------------------------------------------
// Documentos del checklist
// ---------------------------------------------------------------------

export async function registrarRecepcion(
  kycExpedienteId: string | number,
  input: RegistrarRecepcionInput,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(kycExpedienteId);
  const expediente = id === null ? null : await cargarVisible(id, user);

  if (!expediente) {
    return null;
  }

  if (expedienteFinal(expediente.estado)) {
    throw new KycEstadoNoPermitidoError(
      "El expediente ya tiene dictamen y no admite cambios documentales",
    );
  }

  const documento = expediente.documentos.find(
    (item) => item.codigo === input.documentoRequeridoCodigo,
  );

  if (!documento) {
    return null;
  }

  if (expedienteFinal(documento.estado)) {
    throw new KycEstadoNoPermitidoError(
      "El documento ya fue revisado y no admite una nueva recepción",
    );
  }

  const actualizado = await repository.registrarRecepcion({
    expedienteId: expediente.kycExpedienteId,
    kycDocumentoId: documento.kycDocumentoId,
    archivoReferencia: input.archivoReferencia,
    observacion: input.observacion ?? null,
    usuarioId: user.oid,
    usuarioNombre: user?.name || "",
  });

  if (!actualizado) {
    throw new KycEstadoNoPermitidoError(
      "El documento cambió de estado durante la operación; vuelva a consultarlo",
    );
  }

  const documentos = await repository.findDocumentosByExpediente(
    expediente.kycExpedienteId,
  );

  return (
    documentos.find(
      (item) => item.kycDocumentoId === documento.kycDocumentoId,
    ) ?? null
  );
}

export async function revisarDocumento(
  kycExpedienteId: string | number,
  kycDocumentoId: string | number,
  input: RevisarDocumentoInput,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(kycExpedienteId);
  const documentoId = aEnteroPositivo(kycDocumentoId);
  const expediente =
    id === null || documentoId === null ? null : await cargarVisible(id, user);

  if (!expediente) {
    return null;
  }

  if (expedienteFinal(expediente.estado)) {
    throw new KycEstadoNoPermitidoError(
      "El expediente ya tiene dictamen y no admite cambios documentales",
    );
  }

  const documento = expediente.documentos.find(
    (item) => item.kycDocumentoId === documentoId,
  );

  if (!documento) {
    return null;
  }

  const revisaElExpediente =
    input.estado === "VALIDADO" || input.estado === "RECHAZADO";

  if (revisaElExpediente && !esCompliance(user)) {
    throw new KycAccionReservadaError(
      "Solo compliance puede validar o rechazar documentos",
    );
  }

  if (revisaElExpediente && documento.estado !== "RECIBIDO") {
    throw new KycEstadoNoPermitidoError(
      "Solo se puede validar o rechazar un documento en estado RECIBIDO",
    );
  }

  const actualizado = await repository.revisarDocumento({
    expedienteId: expediente.kycExpedienteId,
    kycDocumentoId: documento.kycDocumentoId,
    estado: input.estado,
    observacion: input.observacion ?? null,
    usuarioId: user.oid,
    usuarioNombre: user?.name || "",
  });

  if (!actualizado) {
    throw new KycEstadoNoPermitidoError(
      "El documento cambió de estado durante la operación; vuelva a consultarlo",
    );
  }

  const documentos = await repository.findDocumentosByExpediente(
    expediente.kycExpedienteId,
  );

  return (
    documentos.find(
      (item) => item.kycDocumentoId === documento.kycDocumentoId,
    ) ?? null
  );
}

// ---------------------------------------------------------------------
// Dictamen (exclusivo de compliance)
// ---------------------------------------------------------------------

export async function dictaminar(
  kycExpedienteId: string | number,
  input: DictamenInput,
  user: AuthenticatedUser,
) {
  if (!esCompliance(user)) {
    throw new KycAccionReservadaError(
      "Solo compliance puede emitir el dictamen KYC",
    );
  }

  const id = aEnteroPositivo(kycExpedienteId);
  const expediente = id === null ? null : await cargarVisible(id, user);

  if (!expediente) {
    return null;
  }

  if (expedienteFinal(expediente.estado)) {
    throw new KycEstadoNoPermitidoError(
      "El expediente ya tiene dictamen y no admite uno nuevo",
    );
  }

  if (input.estado === "VALIDADO") {
    const pendientes =
      await repository.contarDocumentosObligatoriosPendientes(
        expediente.kycExpedienteId,
      );

    if (pendientes > 0) {
      throw new KycDictamenIncompletoError(
        `No se puede validar el expediente: faltan ${pendientes} documentos obligatorios por validar`,
      );
    }
  }

  const dictaminado = await repository.dictaminarExpediente({
    expedienteId: expediente.kycExpedienteId,
    estado: input.estado,
    observacion: input.observacion ?? null,
    usuarioId: user.oid,
    usuarioNombre: user?.name || "",
  });

  if (!dictaminado) {
    throw new KycEstadoNoPermitidoError(
      "El expediente cambió de estado durante el dictamen; vuelva a consultarlo",
    );
  }

  const documentos = await repository.findDocumentosByExpediente(
    expediente.kycExpedienteId,
  );

  return aRespuesta(
    { ...dictaminado, documentos },
    calcularSla(dictaminado, await umbralSla()),
  );
}

// ---------------------------------------------------------------------
// SLA (S13)
// ---------------------------------------------------------------------

export async function obtenerSla(
  kycExpedienteId: string | number,
  user: AuthenticatedUser,
) {
  const id = aEnteroPositivo(kycExpedienteId);
  const expediente = id === null ? null : await cargarVisible(id, user);

  if (!expediente) {
    return null;
  }

  return calcularSla(expediente, await umbralSla());
}
