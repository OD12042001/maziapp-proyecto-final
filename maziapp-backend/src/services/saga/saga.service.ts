import { APP_ROLES } from "../../config/roles";
import { Ejecutor } from "../../repositories/auditoria/auditoria.repository";
import * as repository from "../../repositories/saga/saga.repository";
import { AuthenticatedUser } from "../../types/authenticated-user";
import { MensajeEsb } from "../esb/esb.consumidores";

/**
 * Servicio de Orquestación Saga BPM (`KYC_CIERRE_COMISION`).
 *
 * Conecta el proceso empresarial con los servicios SOA (requisito S4):
 *  - Paso 1 (S06): `EtapaCambiada` → inicia la saga y completa el paso 1.
 *  - Paso 2 (S12): `KycEstadoCambiado`:
 *      - `PENDIENTE` / `EN_PROCESO` → paso 2 `EN_CURSO`.
 *      - `VALIDADO` → paso 2 `COMPLETADO`.
 *      - `RECHAZADO` → paso 2 `FALLIDO`, paso 1 `COMPENSADO`, compensa la
 *        oportunidad a `PERDIDA` (S06) y cierra la saga en `COMPENSADA`.
 *  - Paso 3 (S15): `CierreGanadoRegistrado` → completa el paso 3.
 *  - Paso 4 (S16/S17):
 *      - `ComisionCalculada` → completa el paso 4 y cierra la saga en
 *        `COMPLETADA`.
 *      - `ComisionRevertida` → marca el paso 4 `COMPENSADO` y la saga en
 *        `COMPENSADA`.
 */

const ROLES_VEN_CARTERA_AJENA: string[] = [
  APP_ROLES.DIRECCION_COMERCIAL,
  APP_ROLES.ADMINISTRACION,
  APP_ROLES.GERENCIA_GENERAL,
];

function puedeVerCarteraAjena(user: AuthenticatedUser): boolean {
  const roles = (user?.roles || []).map((r) => r.toLowerCase());
  return ROLES_VEN_CARTERA_AJENA.some((rol) =>
    roles.includes(rol.toLowerCase()),
  );
}

function esVisible(responsableId: string, user: AuthenticatedUser): boolean {
  if (puedeVerCarteraAjena(user)) {
    return true;
  }

  const prop = responsableId?.toLowerCase();
  const oid = user?.oid?.toLowerCase();

  return Boolean(prop && oid && prop === oid);
}

export async function obtenerSaga(
  correlationId: string,
  user: AuthenticatedUser,
) {
  const saga = await repository.findSagaByCorrelationId(correlationId);

  if (!saga || !esVisible(saga.responsableId, user)) {
    return null;
  }

  const { responsableId, ...respuesta } = saga;
  return respuesta;
}

export async function procesarEventoEnSaga(
  mensaje: MensajeEsb,
  tx: Ejecutor,
): Promise<void> {
  const oportunidadId = Number(mensaje.payload?.oportunidadId);

  if (!Number.isInteger(oportunidadId) || oportunidadId <= 0) {
    return;
  }

  const sagaInstanciaId = await repository.asegurarSagaEnTx(
    tx,
    oportunidadId,
    mensaje.correlationId,
  );

  switch (mensaje.tipoEvento) {
    case "EtapaCambiada": {
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 1, {
        estado: "COMPLETADO",
        payload: mensaje.payload,
      });
      await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
        pasoActual: 1,
        estado: "EN_CURSO",
        finalizada: false,
      });
      break;
    }

    case "KycEstadoCambiado": {
      const estadoNuevo = String(mensaje.payload?.estadoNuevo ?? "");

      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 1, {
        estado: "COMPLETADO",
      });

      if (estadoNuevo === "VALIDADO") {
        await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 2, {
          estado: "COMPLETADO",
          payload: mensaje.payload,
        });
        await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
          pasoActual: 2,
          estado: "EN_CURSO",
          finalizada: false,
        });
      } else if (estadoNuevo === "RECHAZADO") {
        const motivoError = "Expediente KYC rechazado por Compliance";

        await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 2, {
          estado: "FALLIDO",
          error: motivoError,
          payload: mensaje.payload,
        });
        await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 1, {
          estado: "COMPENSADO",
          error: "Oportunidad cerrada como PERDIDA por rechazo KYC",
        });
        await repository.compensarOportunidadPorKycRechazadoEnTx(
          tx,
          oportunidadId,
          mensaje.correlationId,
        );
        await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
          pasoActual: 2,
          estado: "COMPENSADA",
          finalizada: true,
          ultimoError: motivoError,
        });
      } else {
        await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 2, {
          estado: "EN_CURSO",
          payload: mensaje.payload,
        });
        await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
          pasoActual: 2,
          estado: "EN_CURSO",
          finalizada: false,
        });
      }
      break;
    }

    case "CierreGanadoRegistrado": {
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 1, {
        estado: "COMPLETADO",
      });
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 2, {
        estado: "COMPLETADO",
      });
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 3, {
        estado: "COMPLETADO",
        payload: mensaje.payload,
      });
      await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
        pasoActual: 3,
        estado: "EN_CURSO",
        finalizada: false,
      });
      break;
    }

    case "ComisionCalculada": {
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 1, {
        estado: "COMPLETADO",
      });
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 2, {
        estado: "COMPLETADO",
      });
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 3, {
        estado: "COMPLETADO",
      });
      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 4, {
        estado: "COMPLETADO",
        payload: mensaje.payload,
      });
      await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
        pasoActual: 4,
        estado: "COMPLETADA",
        finalizada: true,
        ultimoError: null,
      });
      break;
    }

    case "ComisionRevertida": {
      const motivo = String(
        mensaje.payload?.motivoCodigo ?? "REVERSION_COMISION",
      );
      const detalleError = `Comisión revertida (${motivo})`;

      await repository.actualizarPasoEnTx(tx, sagaInstanciaId, 4, {
        estado: "COMPENSADO",
        error: detalleError,
        payload: mensaje.payload,
      });
      await repository.actualizarEstadoInstanciaEnTx(tx, sagaInstanciaId, {
        pasoActual: 4,
        estado: "COMPENSADA",
        finalizada: true,
        ultimoError: detalleError,
      });
      break;
    }

    default:
      break;
  }
}
