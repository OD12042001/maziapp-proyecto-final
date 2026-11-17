import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

import { ENV } from "../config/env";

const tenantId = ENV.azure.tenantId;
const frontClientId = ENV.azure.frontClientId;
const apiClientId = ENV.azure.apiClientId;

const client = jwksClient({
  jwksUri: ENV.azure.jwksUri,
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null);

      return;
    }

    const signingKey = key?.getPublicKey();

    callback(null, signingKey);
  });
}

export function validateToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,

      getKey,

      {
        audience: apiClientId,

        issuer: ENV.azure.issuer,

        algorithms: ["RS256"],

        clockTolerance: 5,
      },

      (err, decoded: any) => {
        if (err) {
          return reject(err);
        }

        if (!decoded) {
          return reject(new Error("Token vacío"));
        }

        // 🔐 Validar tenant
        if (decoded.tid !== tenantId) {
          return reject(new Error("Invalid tenant"));
        }

        // 🔐 Validar audience API
        if (decoded.aud !== apiClientId) {
          return reject(new Error("Invalid audience"));
        }

        // 🔐 Validar frontend autorizado

        if (decoded.azp && decoded.azp !== frontClientId) {
          return reject(new Error("Aplicación no autorizada"));
        }

        const scopes = decoded?.scp?.split(" ") || [];

        const roles = decoded?.roles || [];

        if (!Array.isArray(roles)) {
          return reject(new Error("Roles inválidos"));
        }

        // 🔐 Validar scope API
        const validScope = scopes.includes(ENV.azure.scope);

        // 🔐 Validar roles Azure AD
        const validRole = roles.length > 0;

        if (!validScope && !validRole) {
          return reject(new Error("Sin permisos válidos"));
        }

        resolve(decoded);
      },
    );
  });
}
