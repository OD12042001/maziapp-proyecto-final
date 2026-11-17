jest.mock("@azure/functions", () => {
  const actual = jest.requireActual("@azure/functions");
  return {
    ...actual,
    app: { ...actual.app, http: jest.fn() },
  };
});

jest.mock("../../../services/saga/saga.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";
import { SAGA_ROLES_LECTURA } from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

beforeAll(() => {
  require("../getSaga");
  require("../sagaCorsPreflight");

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

describe("saga routing (S4)", () => {
  test("registra GET sagas/{correlationId} y su preflight OPTIONS", () => {
    expect(todas().map(clave).sort()).toEqual([
      "GET sagas/{correlationId}",
      "OPTIONS sagas/{correlationId}",
    ]);
  });

  test("matriz de roles alineada con el contrato OpenAPI", () => {
    expect(SAGA_ROLES_LECTURA).toEqual([
      "ejecutivo_inversion",
      "direccion_comercial",
      "administracion",
      "gerencia_general",
    ]);
  });
});
