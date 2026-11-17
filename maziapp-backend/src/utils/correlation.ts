import { HttpRequest } from "@azure/functions";

/**
 * Resuelve el `X-Correlation-Id` de una petición de negocio.
 *
 * El header lo envía el cliente (frontend o integración), pero es dato
 * NO confiable: se persiste en `OportunidadEtapaHistorial.CorrelationId`
 * (nvarchar(64)) y se publica en el outbox. Por eso se acepta solo si
 * respeta el largo de la columna y un juego de caracteres acotado; si
 * no, se genera uno a partir de la invocación. Nunca se rechaza una
 * petición por traer un correlation id inválido: se reemplaza.
 */

const LARGO_MAXIMO = 64;

const PATRON_PERMITIDO = /^[A-Za-z0-9._:-]+$/;

export function obtenerCorrelationId(
  req: HttpRequest,
  porDefecto: string,
): string {
  const crudo = (req.headers.get("x-correlation-id") || "").trim();

  if (
    crudo.length === 0 ||
    crudo.length > LARGO_MAXIMO ||
    !PATRON_PERMITIDO.test(crudo)
  ) {
    return porDefecto;
  }

  return crudo;
}
