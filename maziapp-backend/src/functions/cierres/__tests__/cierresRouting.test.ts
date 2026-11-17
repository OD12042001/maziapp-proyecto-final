jest.mock("@azure/functions", () => {
  const actual = jest.requireActual("@azure/functions");
  return {
    ...actual,
    app: { ...actual.app, http: jest.fn() },
  };
});

jest.mock("../../../services/cierres/cierres.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";
import {
  CIERRES_ROLES_ESCRITURA,
  CIERRES_ROLES_LECTURA,
} from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

const OPERACIONES_ESPERADAS = [
  "GET cierres",
  "POST cierres",
  "GET cierres/{cierreId:int}",
];

beforeAll(() => {
  require("../getCierres");
  require("../createCierre");
  require("../getCierre");
  require("../cierresCorsPreflight");

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

describe("cierres routing (S15)", () => {
  test("registra exactamente las 3 operaciones del contrato", () => {
    expect(operaciones().map(clave).sort()).toEqual(
      [...OPERACIONES_ESPERADAS].sort(),
    );
  });

  test("preflight OPTIONS explícito por ruta y sin comodines", () => {
    expect(preflights().map((c) => c.route).sort()).toEqual([
      "cierres",
      "cierres/{cierreId:int}",
    ]);
  });

  test("matriz de roles alineada con el contrato OpenAPI", () => {
    expect(CIERRES_ROLES_LECTURA).toEqual([
      "ejecutivo_inversion",
      "direccion_comercial",
      "administracion",
      "gerencia_general",
    ]);
    expect(CIERRES_ROLES_ESCRITURA).toEqual(["ejecutivo_inversion"]);
  });
});
