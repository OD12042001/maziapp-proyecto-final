import * as auditoria from "../../repositories/auditoria/auditoria.repository";
import { Ejecutor } from "../../repositories/auditoria/auditoria.repository";
import { TipoEventoOutbox } from "../../repositories/esb/outbox.repository";
import { calcularComisionParaCierreEnTx } from "../comisiones/comisiones.service";
import { procesarEventoEnSaga } from "../saga/saga.service";

/**
 * Registro de consumidores del ESB lógico.
 *
 * Un CONSUMIDOR es un suscriptor de un tipo de evento. El ESB lo invoca
 * con el mensaje en su forma CANÓNICA (`MensajeEsb`), independiente de
 * cómo esté guardado en la tabla (transformación), y dentro de una
 * transacción que ya contiene su marca de consumo: sus efectos en base
 * de datos y la marca se confirman juntos o ninguno.
 *
 * Contrato del manejador:
 *  - debe operar SOLO con el `Ejecutor` recibido para sus escrituras;
 *  - lanzar para pedir reintento; el ESB revierte la transacción;
 *  - puede ejecutarse más de una vez para el mismo mensaje únicamente si
 *    no llegó a confirmar: tras confirmar, la marca de consumo impide el
 *    segundo efecto.
 *
 * T6 (saga BPM) registra aquí sus consumidores.
 */

export interface MensajeEsb {
  outboxId: string;
  tipoEvento: string;
  agregado: string;
  agregadoId: string;
  correlationId: string | null;
  /** Número de intento de entrega, desde 1. */
  intento: number;
  creadoUtc: string;
  payload: Record<string, unknown>;
}

export type ManejadorConsumidor = (
  mensaje: MensajeEsb,
  tx: Ejecutor,
) => Promise<void>;

export interface Consumidor {
  /** Nombre estable: forma parte de la clave de idempotencia del consumo. */
  nombre: string;
  /** Tipos suscritos, o `"*"` para todos. */
  tipos: TipoEventoOutbox[] | "*";
  manejar: ManejadorConsumidor;
}

const consumidores = new Map<string, Consumidor>();

export function registrarConsumidor(consumidor: Consumidor): void {
  consumidores.set(consumidor.nombre, consumidor);
}

export function consumidoresPara(tipoEvento: string): Consumidor[] {
  return [...consumidores.values()].filter(
    (c) => c.tipos === "*" || (c.tipos as string[]).includes(tipoEvento),
  );
}

/**
 * Consumidor de trazabilidad: deja constancia en la bitácora (S40) de
 * que el ESB entregó el evento, bajo la MISMA correlación que originó la
 * operación. Permite reconstruir la cadena
 *   operación → evento publicado → evento entregado
 * consultando `GET /auditoria/eventos?correlationId=...`.
 */
export const CONSUMIDOR_TRAZA = "TrazaAuditoria";

export const consumidorTraza: Consumidor = {
  nombre: CONSUMIDOR_TRAZA,
  tipos: "*",
  async manejar(mensaje, tx) {
    await auditoria.registrarEvento(
      tx,
      {
        servicioCodigo: "ESB",
        operacion: "EntregaEvento",
        entidad: mensaje.agregado,
        entidadId: mensaje.agregadoId,
        resultado: "EXITO",
        detalle: {
          outboxId: mensaje.outboxId,
          tipoEvento: mensaje.tipoEvento,
          intento: mensaje.intento,
        },
      },
      {
        correlationId: mensaje.correlationId ?? `esb-${mensaje.outboxId}`,
        direccionIp: null,
        userAgent: null,
      },
    );
  },
};

/**
 * Consumidor de negocio S16: al entregarse `CierreGanadoRegistrado`,
 * calcula la comisión del 3 % (incluido IGV) y publica
 * `ComisionCalculada` en la misma transacción.
 */
export const CONSUMIDOR_COMISION_S16 = "CalculoComisionS16";

export const consumidorCalculoComision: Consumidor = {
  nombre: CONSUMIDOR_COMISION_S16,
  tipos: ["CierreGanadoRegistrado"],
  async manejar(mensaje, tx) {
    const cierreId = Number(
      mensaje.payload?.cierreId ?? mensaje.agregadoId,
    );

    if (!Number.isInteger(cierreId) || cierreId <= 0) {
      throw new Error(
        `Evento CierreGanadoRegistrado (${mensaje.outboxId}) sin cierreId válido`,
      );
    }

    await calcularComisionParaCierreEnTx(
      tx,
      cierreId,
      mensaje.correlationId,
    );
  },
};

/**
 * Consumidor BPM (S4): mantiene el estado de la instancia de saga y sus
 * pasos para cada oportunidad, y ejecuta la compensación si KYC se
 * rechaza o la comisión se revierte.
 */
export const CONSUMIDOR_SAGA_BPM = "OrquestadorSagaBpm";

export const consumidorSagaBpm: Consumidor = {
  nombre: CONSUMIDOR_SAGA_BPM,
  tipos: [
    "EtapaCambiada",
    "KycEstadoCambiado",
    "CierreGanadoRegistrado",
    "ComisionCalculada",
    "ComisionRevertida",
  ],
  async manejar(mensaje, tx) {
    await procesarEventoEnSaga(mensaje, tx);
  },
};

/** Restablece el registro al estado de fábrica (traza + S16 + Saga BPM). */
export function reiniciarConsumidores(): void {
  consumidores.clear();
  registrarConsumidor(consumidorTraza);
  registrarConsumidor(consumidorCalculoComision);
  registrarConsumidor(consumidorSagaBpm);
}

reiniciarConsumidores();
