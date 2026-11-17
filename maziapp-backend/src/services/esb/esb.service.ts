import { getPool } from "../../config/sql";
import * as auditoria from "../../repositories/auditoria/auditoria.repository";
import * as configuracion from "../../repositories/configuracion/configuracion.repository";
import * as repository from "../../repositories/esb/outbox.repository";
import {
  Consumidor,
  MensajeEsb,
  consumidoresPara,
} from "./esb.consumidores";
import {
  ListarOutboxQuery,
  ListarOutboxFallidosQuery,
} from "../../validators/esb.validator";

/**
 * ESB lógico: despachador del outbox transaccional.
 *
 * Qué hace el bus (y dónde se ve):
 *  - MEDIACIÓN: los servicios no se llaman entre sí; publican hechos en
 *    el outbox y el bus los entrega (`procesarOutbox`).
 *  - ENRUTAMIENTO: cada mensaje va a los consumidores suscritos a su
 *    tipo (`consumidoresPara`).
 *  - TRANSFORMACIÓN: la fila de base de datos se convierte al mensaje
 *    canónico `MensajeEsb` (payload ya parseado, metadatos de entrega).
 *  - FIABILIDAD: reintento con backoff exponencial, cola de fallidos
 *    (`MUERTO`) y consumo idempotente por (mensaje, consumidor).
 *
 * La semántica es AL-MENOS-UNA-VEZ en la entrega y EXACTAMENTE-UNA-VEZ en
 * el efecto, porque la marca de consumo y los efectos del consumidor
 * comparten transacción.
 */

export class EsbNoConfiguradoError extends Error {
  constructor(clave: string) {
    super(`El parámetro ${clave} no está configurado o no es un entero`);
    this.name = "EsbNoConfiguradoError";
  }
}

export interface ResultadoProcesamiento {
  procesados: number;
  publicados: number;
  fallidos: number;
  muertos: number;
}

async function parametro(clave: string): Promise<number> {
  const valor = await configuracion.findParametroEntero(clave);

  if (valor === null || valor <= 0) {
    throw new EsbNoConfiguradoError(clave);
  }

  return valor;
}

/**
 * Espera antes del próximo intento: `base · 2^(intentos-1)` segundos,
 * acotada por `max`. Con base 10: 10 s, 20 s, 40 s, 80 s…
 */
export function calcularBackoffSegundos(
  intentos: number,
  baseSegundos: number,
  maxSegundos: number,
): number {
  const exponente = Math.max(0, intentos - 1);

  return Math.min(baseSegundos * 2 ** exponente, maxSegundos);
}

function aMensaje(evento: repository.EventoOutbox): MensajeEsb {
  const payload =
    evento.payload && typeof evento.payload === "object"
      ? (evento.payload as Record<string, unknown>)
      : {};

  return {
    outboxId: evento.outboxId,
    tipoEvento: evento.tipoEvento,
    agregado: evento.agregado,
    agregadoId: evento.agregadoId,
    correlationId: evento.correlationId,
    intento: evento.intentos,
    creadoUtc: evento.creadoFechaUtc,
    payload,
  };
}

/**
 * Entrega el mensaje a UN consumidor dentro de su propia transacción.
 * Si el consumidor ya procesó este mensaje, no hace nada.
 */
async function entregar(
  consumidor: Consumidor,
  mensaje: MensajeEsb,
): Promise<void> {
  const pool = await getPool();
  const transaction = pool.transaction();

  await transaction.begin();

  try {
    const esNuevo = await repository.registrarConsumo(
      transaction,
      mensaje.outboxId,
      consumidor.nombre,
    );

    if (!esNuevo) {
      await transaction.rollback();
      return;
    }

    await consumidor.manejar(mensaje, transaction);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function describirError(error: unknown): string {
  const nombre = (error as Error)?.name ?? "Error";
  const mensaje = (error as Error)?.message ?? String(error);

  return `${nombre}: ${mensaje}`;
}

/**
 * Una pasada del despachador: reserva un lote y entrega cada mensaje a
 * todos sus consumidores. Un mensaje se publica solo si TODOS tuvieron
 * éxito; si alguno falla, se reintenta (los consumidores que ya
 * confirmaron no repiten su efecto) o pasa a la cola de fallidos.
 */
export async function procesarOutbox(
  limite: number,
): Promise<ResultadoProcesamiento> {
  const [maxReintentos, backoffBase, backoffMax] = await Promise.all([
    parametro("ESB_MAX_REINTENTOS"),
    parametro("ESB_BACKOFF_BASE_SEGUNDOS"),
    parametro("ESB_BACKOFF_MAX_SEGUNDOS"),
  ]);

  const lote = await repository.reclamarLote(limite);

  const resultado: ResultadoProcesamiento = {
    procesados: lote.length,
    publicados: 0,
    fallidos: 0,
    muertos: 0,
  };

  for (const evento of lote) {
    const mensaje = aMensaje(evento);

    try {
      for (const consumidor of consumidoresPara(evento.tipoEvento)) {
        await entregar(consumidor, mensaje);
      }

      if (await repository.marcarPublicado(evento.outboxId)) {
        resultado.publicados += 1;
      }
    } catch (error) {
      const descripcion = describirError(error);

      if (evento.intentos >= maxReintentos) {
        await repository.marcarFallo(evento.outboxId, descripcion, null);
        resultado.muertos += 1;
      } else {
        const espera = calcularBackoffSegundos(
          evento.intentos,
          backoffBase,
          backoffMax,
        );

        await repository.marcarFallo(
          evento.outboxId,
          descripcion,
          new Date(Date.now() + espera * 1000),
        );
        resultado.fallidos += 1;
      }
    }
  }

  await registrarCorrida(resultado);

  return resultado;
}

/**
 * Deja constancia de la corrida en la bitácora. Mejor esfuerzo: el
 * trabajo del despachador ya está confirmado y no debe fallar por esto.
 */
async function registrarCorrida(resultado: ResultadoProcesamiento) {
  if (resultado.procesados === 0) {
    return;
  }

  try {
    const pool = await getPool();

    await auditoria.registrarEvento(pool, {
      servicioCodigo: "ESB",
      operacion: "ProcesarOutbox",
      entidad: "Outbox",
      resultado: "EXITO",
      detalle: { ...resultado },
    });
  } catch (error) {
    console.error("No se pudo auditar la corrida del despachador", error);
  }
}

export async function listarOutbox(filtros: ListarOutboxQuery) {
  const resultado = await repository.findOutbox({
    estado: filtros.estado,
    tipoEvento: filtros.tipoEvento,
    page: filtros.page,
    pageSize: filtros.pageSize,
  });

  return {
    items: resultado.items,
    page: filtros.page,
    pageSize: filtros.pageSize,
    total: resultado.total,
  };
}

export async function listarFallidos(filtros: ListarOutboxFallidosQuery) {
  const resultado = await repository.findOutbox({
    estado: "MUERTO",
    page: filtros.page,
    pageSize: filtros.pageSize,
  });

  return {
    items: resultado.items,
    page: filtros.page,
    pageSize: filtros.pageSize,
    total: resultado.total,
  };
}

export async function obtenerOutbox(outboxId: string) {
  return repository.findOutboxById(outboxId);
}
