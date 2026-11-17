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

jest.mock("../../../services/esb/esb.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";
import { ESB_ROLES_ADMIN } from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

const OPERACIONES_ESPERADAS = [
  "GET esb/outbox",
  "GET esb/outbox/fallidos",
  "GET esb/outbox/{outboxId:long}",
  "POST esb/outbox/procesar",
];

beforeAll(() => {
  require("../getOutbox");
  require("../getOutboxFallidos");
  require("../getOutboxEvento");
  require("../procesarOutbox");
  require("../esbCorsPreflight");

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

describe("esb routing", () => {
  test("registra exactamente las 4 operaciones del contrato ESB", () => {
    const claves = operaciones().map(clave).sort();
    expect(claves).toEqual([...OPERACIONES_ESPERADAS].sort());
  });

  test("cada ruta tiene su preflight OPTIONS explícito sin comodines", () => {
    const rutasPreflight = preflights().map((c) => c.route).sort();
    expect(rutasPreflight).toEqual([
      "esb/outbox",
      "esb/outbox/fallidos",
      "esb/outbox/procesar",
      "esb/outbox/{outboxId:long}",
    ]);

    for (const p of preflights()) {
      expect(p.route).not.toContain("*");
      expect(p.authLevel).toBe("anonymous");
    }
  });

  test("matriz de roles: exclusivo de administración", () => {
    expect(ESB_ROLES_ADMIN).toEqual(["administracion"]);
  });
});
