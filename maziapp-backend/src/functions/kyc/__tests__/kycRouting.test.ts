/**
 * Registro HTTP del módulo KYC (S12/S13).
 *
 * No prueba el enrutamiento del host (`func start`/Azure, fuera de
 * Jest); prueba la configuración que cada Function entrega a
 * `app.http(...)` y la matriz de roles que declara el contrato. El
 * enfoque es el mismo de `pipelineRouting.test.ts`.
 */
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

// Mocks mínimos para importar los handlers sin arrastrar Azure SQL ni el
// cliente JWKS (que publica ESM y Jest no transforma).
jest.mock("../../../services/kyc/kyc.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";

import { KYC_ROLES_ACCESO, KYC_ROLES_DICTAMEN } from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

const OPERACIONES_ESPERADAS = [
  "GET kyc/documentos-requeridos",
  "GET kyc/expedientes",
  "POST kyc/expedientes",
  "GET kyc/expedientes/{expedienteId:int}",
  "POST kyc/expedientes/{expedienteId:int}/documentos",
  "PATCH kyc/expedientes/{expedienteId:int}/documentos/{documentoId:int}",
  "POST kyc/expedientes/{expedienteId:int}/dictamen",
  "GET kyc/expedientes/{expedienteId:int}/sla",
];

beforeAll(() => {
  require("../getDocumentosRequeridosKyc");
  require("../getExpedientesKyc");
  require("../createExpedienteKyc");
  require("../getExpedienteKyc");
  require("../registrarDocumentoKyc");
  require("../revisarDocumentoKyc");
  require("../dictaminarExpedienteKyc");
  require("../getSlaKyc");
  require("../kycCorsPreflight");

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

describe("kyc routing -> operaciones", () => {
  test("registra exactamente las 8 operaciones del contrato", () => {
    const claves = operaciones()
      .map(clave)
      .sort();

    expect(claves).toEqual([...OPERACIONES_ESPERADAS].sort());
  });

  test("todas las operaciones son anónimas a nivel de host (el rol lo exige withAuth)", () => {
    for (const config of operaciones()) {
      expect(config.authLevel).toBe("anonymous");
    }
  });

  test("no hay dos Functions compitiendo por el mismo método y ruta", () => {
    const claves = todas().map(clave);

    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe("kyc routing -> preflight CORS", () => {
  test("cada ruta tiene su OPTIONS, sin comodines", () => {
    const rutasDistintas = new Set(
      OPERACIONES_ESPERADAS.map((claveOperacion) =>
        claveOperacion.slice(claveOperacion.indexOf(" ") + 1),
      ),
    );
    const rutasConPreflight = new Set(
      preflights().map((config) => config.route),
    );

    expect(preflights().length).toBe(rutasDistintas.size);

    for (const ruta of rutasDistintas) {
      expect(rutasConPreflight.has(ruta)).toBe(true);
    }

    for (const config of preflights()) {
      expect(config.route).not.toContain("*");
      expect(config.authLevel).toBe("anonymous");
      expect(config.methods).toEqual(["OPTIONS"]);
    }
  });
});

describe("kyc routing -> matriz de roles (paridad con el contrato)", () => {
  test("acceso general: ejecutivo_inversion y compliance", () => {
    expect(KYC_ROLES_ACCESO).toEqual([
      "ejecutivo_inversion",
      "compliance",
    ]);
  });

  test("dictamen: exclusivo de compliance", () => {
    expect(KYC_ROLES_DICTAMEN).toEqual(["compliance"]);
  });
});
