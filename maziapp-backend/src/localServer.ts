import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";

/**
 * Servidor HTTP ligero de desarrollo local (`http://localhost:7071/api`).
 *
 * Actúa como envoltura (wrapper) sobre los handlers registrados en
 * `functionApp.ts` sin requerir Azure Functions Core Tools (`func`), y
 * expone además el contrato OpenAPI (`/api/openapi.yaml`) y Swagger UI
 * (`/api/docs`) para las evidencias funcionales de la Etapa 3 (APF3).
 */

function cargarLocalSettings(): void {
  const candidatos = [
    path.resolve(process.cwd(), "local.settings.json"),
    path.resolve(__dirname, "../../local.settings.json"),
  ];

  for (const archivo of candidatos) {
    if (fs.existsSync(archivo)) {
      const contenido = JSON.parse(fs.readFileSync(archivo, "utf8"));
      const valores = contenido?.Values ?? {};
      for (const [clave, valor] of Object.entries(valores)) {
        if (process.env[clave] === undefined && typeof valor === "string") {
          process.env[clave] = valor;
        }
      }
      return;
    }
  }
}

cargarLocalSettings();

import {
  app,
  HttpHandler,
  HttpMethod,
  HttpRequest,
  InvocationContext,
} from "@azure/functions";

interface RutaRegistrada {
  name: string;
  methods: string[];
  route: string;
  regex: RegExp;
  paramNames: string[];
  specificity: number;
  handler: HttpHandler;
}

const rutas: RutaRegistrada[] = [];

function compilarRuta(route: string): {
  regex: RegExp;
  paramNames: string[];
  specificity: number;
} {
  const limpia = route.replace(/^\/+|\/+$/g, "");
  const segmentos = limpia.split("/");
  const paramNames: string[] = [];
  let specificity = 0;

  const partesRegex = segmentos.map((seg) => {
    const match = /^\{([^}:?]+)(?::([^}?]+))?(\?)?\}$/.exec(seg);
    if (!match) {
      specificity += 10;
      return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    const [, nombre, restriccion, opcional] = match;
    paramNames.push(nombre);
    specificity += opcional ? 1 : 3;

    const patronValor =
      restriccion === "int" || restriccion === "long"
        ? "[0-9]+"
        : "[^/]+";

    if (opcional) {
      return `(?:/(${patronValor}))?`;
    }
    return `/(${patronValor})`;
  });

  const patronFinal =
    "^" +
    partesRegex
      .map((parte, idx) =>
         idx === 0 && !parte.startsWith("/") && !parte.startsWith("(?:")
          ? "/" + parte
          : parte.startsWith("/") || parte.startsWith("(?:")
            ? parte
            : "/" + parte,
      )
      .join("") +
    "/?$";

  return {
    regex: new RegExp(patronFinal, "i"),
    paramNames,
    specificity,
  };
}

const originalHttp = app.http.bind(app);
(app as any).http = (name: string, options: any) => {
  const methods = (options.methods || ["GET"]).map((m: HttpMethod) =>
    String(m).toUpperCase(),
  );
  const route = String(options.route || name);
  const { regex, paramNames, specificity } = compilarRuta(route);

  rutas.push({
    name,
    methods,
    route,
    regex,
    paramNames,
    specificity,
    handler: options.handler,
  });

  rutas.sort((a, b) => b.specificity - a.specificity);

  try {
    return originalHttp(name, options);
  } catch {
    return undefined;
  }
};

// Importa todas las funciones registradas en la aplicación
import "./functionApp";

function buscarOpenApiPath(): string | null {
  const candidatos = [
    path.resolve(process.cwd(), "../docs/openapi.yaml"),
    path.resolve(process.cwd(), "docs/openapi.yaml"),
    path.resolve(__dirname, "../../../docs/openapi.yaml"),
  ];
  for (const c of candidatos) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function swaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Mazi Flow API — Swagger UI (APF3)</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; background: #fafafa; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true
      });
    };
  </script>
</body>
</html>`;
}

function resolverRuta(
  method: string,
  subpath: string,
): { entrada: RutaRegistrada; params: Record<string, string> } | null {
  for (const entrada of rutas) {
    if (!entrada.methods.includes(method)) continue;
    const m = entrada.regex.exec(subpath);
    if (!m) continue;

    const params: Record<string, string> = {};
    entrada.paramNames.forEach((nombre, i) => {
      if (m[i + 1] !== undefined) {
        params[nombre] = decodeURIComponent(m[i + 1]);
      }
    });

    return { entrada, params };
  }
  return null;
}

function leerCuerpo(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function createLocalServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const host = req.headers.host || "localhost:7071";
      const fullUrl = new URL(req.url || "/", `http://${host}`);
      const method = (req.method || "GET").toUpperCase();

      if (method === "GET" && fullUrl.pathname === "/api/openapi.yaml") {
        const yamlPath = buscarOpenApiPath();
        if (!yamlPath) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ message: "openapi.yaml no encontrado" }));
          return;
        }
        res.writeHead(200, {
          "Content-Type": "application/yaml; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(fs.readFileSync(yamlPath, "utf8"));
        return;
      }

      if (method === "GET" && fullUrl.pathname === "/api/docs") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(swaggerHtml());
        return;
      }

      if (!fullUrl.pathname.startsWith("/api/") && fullUrl.pathname !== "/api") {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Ruta fuera de /api" }));
        return;
      }

      const subpath = fullUrl.pathname.slice(4) || "/";
      const coincidencia = resolverRuta(method, subpath);

      if (!coincidencia) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: `Ruta no encontrada: ${method} ${fullUrl.pathname}`,
          }),
        );
        return;
      }

      const rawBody = await leerCuerpo(req);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (Array.isArray(v)) {
          headers.set(k, v.join(", "));
        } else if (typeof v === "string") {
          headers.set(k, v);
        }
      }

      const azReq = {
        method,
        url: fullUrl.toString(),
        headers,
        query: fullUrl.searchParams,
        params: coincidencia.params,
        text: async () => rawBody,
        json: async () => {
          if (!rawBody.trim()) {
            throw new SyntaxError("Cuerpo vacío");
          }
          return JSON.parse(rawBody);
        },
      } as unknown as HttpRequest;

      const context = {
        invocationId: randomUUID(),
        functionName: coincidencia.entrada.name,
        log: () => undefined,
        warn: () => undefined,
        error: (...args: unknown[]) => console.error(...args),
      } as unknown as InvocationContext;

      const respuesta: any = await coincidencia.entrada.handler(azReq, context);
      const status = respuesta.status ?? 200;
      const outHeaders: Record<string, string> = {};

      if (respuesta.headers) {
        if (respuesta.headers instanceof Headers) {
          respuesta.headers.forEach((v: string, k: string) => {
            outHeaders[k] = v;
          });
        } else {
          for (const [k, v] of Object.entries(
            respuesta.headers as Record<string, string>,
          )) {
            if (v !== undefined) outHeaders[k] = String(v);
          }
        }
      }

      if (respuesta.jsonBody !== undefined) {
        if (!outHeaders["Content-Type"] && !outHeaders["content-type"]) {
          outHeaders["Content-Type"] = "application/json; charset=utf-8";
        }
        res.writeHead(status, outHeaders);
        res.end(JSON.stringify(respuesta.jsonBody));
        return;
      }

      res.writeHead(status, outHeaders);
      res.end(respuesta.body ?? "");
    } catch (error) {
      console.error("Error no controlado en localServer", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Error interno del servidor" }));
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT ?? 7071);
  const server = createLocalServer();
  server.listen(port, () => {
    console.log(
      `Mazi Flow API local activa en http://localhost:${port}/api (${rutas.length} handlers) — Swagger UI en http://localhost:${port}/api/docs`,
    );
  });
}
