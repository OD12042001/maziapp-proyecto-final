import {
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { validateToken } from "../utils/validateToken";
import { AuthenticatedUser } from "../types/authenticated-user";
import { ENV } from "../config/env";
import { establecerUsuarioEnContexto } from "../utils/requestContext";

/**
 * Envuelve un handler con autenticación (JWT de Microsoft Entra ID) y
 * autorización por App Role.
 *
 * 🔐 Modo desarrollo local: si `ENV.auth.devBypass` está activo (ver
 * config/env.ts — exige AUTH_DEV_BYPASS, NODE_ENV distinto de production
 * y ausencia de WEBSITE_INSTANCE_ID), se omite la validación del token y
 * se usa un usuario sintético. La autorización por rol SIGUE aplicándose
 * igual que con un token real: un endpoint restringido a
 * `administracion` sigue devolviendo 403 si el usuario de desarrollo no
 * tiene ese rol. El bypass no otorga permisos extra; solo reemplaza la
 * identidad.
 */
export function withAuth(
  requiredRoles: string[] = [],

  handler: (
    req: HttpRequest,
    context: InvocationContext,
    user: AuthenticatedUser,
  ) => Promise<HttpResponseInit>,
) {
  return async (
    req: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    try {
      let user: AuthenticatedUser;

      if (ENV.auth.devBypass) {
        // 🔐 Aviso deliberadamente ruidoso: si esto aparece en un
        // entorno compartido, algo está mal configurado.
        context.warn(
          "AUTH_DEV_BYPASS ACTIVO: se omite la validación de JWT. Solo desarrollo local.",
          { oid: ENV.auth.devUser.oid },
        );

        user = {
          oid: ENV.auth.devUser.oid,
          name: ENV.auth.devUser.name,
          preferred_username: ENV.auth.devUser.preferred_username,
          roles: ENV.auth.devUser.roles,
        };
      } else {
        const authHeader = req.headers.get("authorization");

        if (!authHeader?.startsWith("Bearer ")) {
          return {
            status: 401,

            jsonBody: {
              error: "Unauthorized",
            },
          };
        }

        const token = authHeader.replace("Bearer ", "").trim();

        const decoded = await validateToken(token);

        // 🔐 MEJORA DE SEGURIDAD (auditoría #1 - CRÍTICO):
        // nunca loggear el payload completo del token (contiene PII: nombre,
        // correo, oid). Solo se registran los identificadores mínimos para
        // trazabilidad/soporte.
        context.log("Usuario autenticado", {
          oid: decoded.oid,
          roles: (decoded.roles || []).map((r: string) => r.toLowerCase()),
        });

        user = {
          oid: decoded.oid,
          name: decoded.name,
          preferred_username: decoded.preferred_username,
          roles: decoded.roles || [],
        };
      }

      // S40: la auditoría necesita saber QUIÉN actuó sin que cada
      // servicio reciba el usuario por parámetro.
      establecerUsuarioEnContexto({
        oid: user.oid,
        name: user.name,
        roles: user.roles || [],
      });

      const normalizedRoles = (user.roles || []).map((r: string) =>
        r.toLowerCase(),
      );

      // 🔐 Validar roles requeridos (idéntico en ambos modos)
      if (requiredRoles.length > 0) {
        const hasRole = requiredRoles.some((role) =>
          normalizedRoles.includes(role.toLowerCase()),
        );

        if (!hasRole) {
          context.warn("Usuario sin permisos suficientes", { oid: user.oid });

          return {
            status: 403,

            jsonBody: {
              error: "Forbidden",
            },
          };
        }
      }

      return await handler(req, context, user);
    } catch (error: any) {
      // 🔐 MEJORA DE SEGURIDAD (auditoría #3 - ALTO):
      // el detalle de la excepción se loggea server-side, pero nunca se
      // devuelve al cliente (podría filtrar información interna).
      context.error("Error de autenticación", error);

      return {
        status: 401,

        jsonBody: {
          error: "Unauthorized",
        },
      };
    }
  };
}
