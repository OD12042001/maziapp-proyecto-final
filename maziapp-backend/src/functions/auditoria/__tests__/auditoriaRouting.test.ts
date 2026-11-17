jest.mock("@azure/functions", () => {
  const actual = jest.requireActual("@azure/functions");

  return {
    ...actual,
    app: {
      ...actual.app,
      http: jest.fn(),
    },
  };
});

jest.mock("../../../services/auditoria/auditoria.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";
import { AUDITORIA_ROLES_LECTURA } from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

const OPERACIONES_ESPERADAS = [
  "GET auditoria/eventos",
  "GET auditoria/eventos/{eventoId:long}",
];

beforeAll(() => {
  require("../getEventosAuditoria");
  require("../getEventoAuditoria");
  require("../auditoriaCorsPreflight");

  for (const call of (app.http as jest.Mock).mock.calls) {
    const [name, config] = call as [string, Registro];
    registros[name] = config;
  }
});

function clave(config: Registro): string {
  return `${config.methods.join(",")} ${config.route}`;
}

function todas(): Registro[] {
  return Object.values(registros);
}

function operaciones(): Registro[] {
  return todas().filter((config) => !config.methods.includes("OPTIONS"));
}

function preflights(): Registro[] {
  return todas().filter((config) => config.methods.includes("OPTIONS"));
}

describe("auditoria routing (S40)", () => {
  test("registra únicamente las 2 operaciones de lectura (bitácora de solo anexado)", () => {
    const claves = operaciones().map(clave).sort();
    expect(claves).toEqual([...OPERACIONES_ESPERADAS].sort());
  });

  test("cada ruta tiene su preflight OPTIONS explícito sin comodines", () => {
    const rutasPreflight = preflights().map((c) => c.route).sort();
    expect(rutasPreflight).toEqual([
      "auditoria/eventos",
      "auditoria/eventos/{eventoId:long}",
    ]);

    for (const p of preflights()) {
      expect(p.route).not.toContain("*");
      expect(p.authLevel).toBe("anonymous");
    }
  });

  test("matriz de roles: administración, gerencia general y compliance", () => {
    expect(AUDITORIA_ROLES_LECTURA).toEqual([
      "administracion",
      "gerencia_general",
      "compliance",
    ]);
  });
});
