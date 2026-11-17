import { HttpRequest } from "@azure/functions";

/**
 * CORS explícito para las rutas de Contactos — Fase 3.2.
 *
 * Contexto: ni `createContacto.ts` ni `getContactos.ts` registraban
 * (antes de esta fase) el método OPTIONS, y ningún código del proyecto
 * emitía headers `Access-Control-*` en las respuestas reales (verificado
 * con `grep -rn "Access-Control" src/` → cero coincidencias). Todo el
 * comportamiento CORS dependía exclusivamente del mecanismo automático
 * de Azure Functions Core Tools, activado por `"Host": { "CORS": ... }`
 * en `local.settings.json` — un mecanismo que (a) no es invocable ni
 * verificable desde este entorno de trabajo (el host `func start` corre
 * en tu terminal, no en el sandbox donde yo ejecuto comandos), y (b) es
 * opaco: no hay forma de auditar en el código qué responde exactamente
 * ni de reproducir el mismo comportamiento una vez desplegado en Azure
 * (donde el CORS del host se configura aparte, en el recurso Function
 * App — no en `local.settings.json`).
 *
 * Esta capa reemplaza esa dependencia implícita por lógica explícita,
 * auditable y con el mismo código en local/QA/producción — la única
 * diferencia entre ambientes es el valor de la variable de entorno
 * CORS_ALLOWED_ORIGINS.
 */

/**
 * Orígenes permitidos, por ambiente (Fase 3.2, punto 6).
 *
 * Se leen de `CORS_ALLOWED_ORIGINS` (lista separada por comas). NO se
 * hardcodea aquí ningún dominio de QA/producción — cada ambiente debe
 * definir su propio valor en su configuración (local.settings.json
 * localmente; App Settings del Function App en Azure). Si la variable
 * no está definida:
 *   - en desarrollo local (`NODE_ENV !== "production"`) se usa
 *     `http://localhost:4200` como conveniencia, por ser el único
 *     origen de desarrollo documentado hasta ahora;
 *   - en cualquier otro caso, no se permite ningún origen
 *     (fail-closed: sin la variable configurada, no hay orígenes
 *     autorizados — nunca se cae a "*").
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS;

  if (raw && raw.trim().length > 0) {
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:4200"];
  }

  return [];
}

/**
 * Calcula los headers CORS para una request dada. Refleja el Origin
 * del cliente ÚNICAMENTE si está en el allowlist explícito — nunca
 * "*", y nunca un origin arbitrario propuesto por el cliente sin
 * verificar (Fase 3.2, punto 3). Si el Origin no está permitido, no se
 * agrega ningún header Access-Control-*, por lo que el navegador
 * bloqueará la respuesta como corresponde.
 *
 * No se incluye `Access-Control-Allow-Credentials`: el flujo usa
 * Bearer Token en el header `Authorization`, no cookies de sesión
 * cross-origin (Fase 3.2, punto 4) — no es necesario ni deseable
 * habilitar el modo de credenciales de CORS para este caso.
 *
 * Access-Control-Allow-Methods (Fase Direcciones): se amplía de
 * "GET, POST, OPTIONS" a "GET, POST, PATCH, DELETE, OPTIONS" —
 * autorizado explícitamente en esta fase — porque updateContacto.ts ya
 * usaba PATCH y deactivateRepresentante.ts ya usaba DELETE sin que
 * este header los incluyera (gap preexistente, no introducido por esta
 * fase); Direcciones agrega updateDireccion.ts (PATCH) y
 * deactivateDireccion.ts (DELETE), que también los necesitan.
 */
export function buildCorsHeaders(req: HttpRequest): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed = getAllowedOrigins();

  const headers: Record<string, string> = {
    // Indica a los caches/CDN intermedios que la respuesta varía según
    // el Origin — evita que una respuesta cacheada para un origen se
    // sirva incorrectamente a otro.
    Vary: "Origin",
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS";
    // S40: el frontend envía `X-Correlation-Id` y, en comandos con efectos
    // irreversibles, `Idempotency-Key`; sin esto el preflight los bloquea.
    headers["Access-Control-Allow-Headers"] =
      "Authorization, Content-Type, X-Correlation-Id, Idempotency-Key";
    // Permite que el navegador lea el id de correlación de la respuesta.
    headers["Access-Control-Expose-Headers"] = "X-Correlation-Id";
  }

  return headers;
}
