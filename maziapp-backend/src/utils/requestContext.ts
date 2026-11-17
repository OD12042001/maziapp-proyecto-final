import { AsyncLocalStorage } from "node:async_hooks";
import { isIP } from "node:net";

import { HttpRequest } from "@azure/functions";

/**
 * Contexto de la solicitud HTTP en curso (S40).
 *
 * Existe para que la auditoría y el outbox reciban el `X-Correlation-Id`,
 * el usuario, la IP y el user-agent SIN cambiar la firma de cada
 * servicio y repositorio de las Etapas 1 y 2. `withCors` (envoltura
 * externa) abre el contexto con la correlación; `withAuth` lo completa
 * con el usuario autenticado.
 *
 * Fuera de una solicitud (tests, scripts, despachador) no hay contexto:
 * `contextoActual()` devuelve `undefined` y quien consume decide.
 */

export interface UsuarioContexto {
  oid: string;
  name?: string;
  roles: string[];
}

export interface ContextoSolicitud {
  correlationId: string;
  direccionIp: string | null;
  userAgent: string | null;
  usuario?: UsuarioContexto;
}

const almacen = new AsyncLocalStorage<ContextoSolicitud>();

export function ejecutarConContexto<T>(
  contexto: ContextoSolicitud,
  fn: () => Promise<T>,
): Promise<T> {
  return almacen.run(contexto, fn);
}

export function contextoActual(): ContextoSolicitud | undefined {
  return almacen.getStore();
}

/**
 * Registra el usuario autenticado en el contexto vigente. No hace nada
 * si no hay contexto (handler invocado sin `withCors`).
 */
export function establecerUsuarioEnContexto(usuario: UsuarioContexto): void {
  const contexto = almacen.getStore();

  if (contexto) {
    contexto.usuario = usuario;
  }
}

/**
 * IP del cliente tal como la informa el proxy. Es dato NO confiable
 * (cualquier cliente puede enviar `X-Forwarded-For`), por eso solo se
 * acepta si es una IP válida y cabe en la columna `nvarchar(45)`.
 */
export function extraerDireccionIp(req: HttpRequest): string | null {
  const cabecera =
    req.headers.get("x-azure-clientip") ||
    req.headers.get("x-forwarded-for") ||
    "";

  const primero = cabecera.split(",")[0]?.trim() ?? "";

  // Azure puede anexar el puerto (`1.2.3.4:5678`).
  const sinPuerto = /^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(primero)
    ? primero.slice(0, primero.lastIndexOf(":"))
    : primero;

  return isIP(sinPuerto) !== 0 ? sinPuerto : null;
}

const LARGO_MAXIMO_USER_AGENT = 300;

export function extraerUserAgent(req: HttpRequest): string | null {
  const valor = (req.headers.get("user-agent") || "").trim();

  return valor.length > 0 ? valor.slice(0, LARGO_MAXIMO_USER_AGENT) : null;
}
