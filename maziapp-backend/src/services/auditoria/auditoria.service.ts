import { getPool } from "../../config/sql";
import * as repository from "../../repositories/auditoria/auditoria.repository";
import { ListarAuditoriaQuery } from "../../validators/auditoria.validator";

/**
 * Servicio de auditoría (S40).
 *
 * Solo lectura hacia afuera: la escritura de eventos de ÉXITO ocurre
 * dentro de la transacción de cada cambio de negocio (repositorios), y la
 * de RECHAZO, aquí, cuando una regla de negocio impide la operación.
 */

export async function listarEventos(filtros: ListarAuditoriaQuery) {
  const resultado = await repository.findEventos({
    servicioCodigo: filtros.servicioCodigo,
    entidad: filtros.entidad,
    entidadId: filtros.entidadId,
    correlationId: filtros.correlationId,
    usuarioId: filtros.usuarioId,
    resultado: filtros.resultado,
    desde: filtros.desde,
    hasta: filtros.hasta,
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

export async function obtenerEvento(eventoId: string) {
  return repository.findEventoById(eventoId);
}

export interface MetaRechazo {
  servicioCodigo: string;
  operacion: string;
  entidad: string;
  entidadId?: string | number | null;
}

/**
 * Ejecuta `fn`; si lanza un error que `esRechazo` reconoce como regla de
 * negocio (409/403 de dominio), anexa un evento `RECHAZO` y relanza el
 * MISMO error, de modo que el handler siga traduciéndolo igual.
 *
 * El registro es de mejor esfuerzo: si la auditoría falla, el rechazo
 * original NO se enmascara (el cliente debe recibir el 409 real, no un
 * 500 por un problema de bitácora). El fallo se reporta por stderr.
 * Los errores inesperados (500) no se registran aquí: no son decisiones
 * de negocio y ya quedan en el log de la invocación.
 */
export async function conAuditoriaDeRechazo<T>(
  meta: MetaRechazo,
  esRechazo: (error: unknown) => boolean,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (esRechazo(error)) {
      try {
        const pool = await getPool();

        await repository.registrarEvento(pool, {
          servicioCodigo: meta.servicioCodigo,
          operacion: meta.operacion,
          entidad: meta.entidad,
          entidadId: meta.entidadId ?? null,
          resultado: "RECHAZO",
          detalle: {
            motivo: (error as Error).name,
            mensaje: (error as Error).message,
          },
        });
      } catch (auditError) {
        console.error(
          "No se pudo registrar el rechazo en la auditoría",
          auditError,
        );
      }
    }

    throw error;
  }
}
