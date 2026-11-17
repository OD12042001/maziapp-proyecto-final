/**
 * Registro HTTP del módulo Pipeline (S06).
 *
 * No puede probar el enrutamiento real del host de Azure Functions (eso
 * lo resuelve `func start` / Azure, fuera de Jest). Lo que SÍ prueba es
 * la configuración que cada Function entrega a `app.http(...)`: ruta,
 * método y nivel de autenticación. Es el mismo enfoque que
 * `contactosRouting.test.ts`, que nació de un bug real de precedencia de
 * rutas: una ruta mal declarada aquí produce un 404 en producción que
 * ningún test de servicio detecta.
 *
 * Se verifican tres reglas:
 *   1. cada operación del contrato está registrada con su método y ruta;
 *   2. toda ruta tiene su preflight OPTIONS (sin comodines);
 *   3. no hay dos Functions compitiendo por el mismo método + ruta.
 *
 * Nota técnica: `app.http(...)` se ejecuta una sola vez, al importar cada
 * módulo. Como `jest.config.js` usa `clearMocks: true`, el historial del
 * mock se borra entre tests; por eso las registraciones se capturan una
 * única vez en `beforeAll` a una estructura propia.
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
jest.mock("../../../services/pipeline/pipeline.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";

import {
  PIPELINE_ROLES_ESCRITURA,
  PIPELINE_ROLES_LECTURA,
} from "../../../config/roles";

type Registro = { methods: string[]; route: string; authLevel: string };

const registros: Record<string, Registro> = {};

const OPERACIONES_ESPERADAS = [
  "GET pipeline/etapas",
  "GET pipeline/oportunidades",
  "POST pipeline/oportunidades",
  "GET pipeline/oportunidades/{oportunidadId:int}",
  "POST pipeline/oportunidades/{oportunidadId:int}/avanzar",
  "POST pipeline/oportunidades/{oportunidadId:int}/perder",
  "GET pipeline/oportunidades/{oportunidadId:int}/historial",
];

beforeAll(() => {
  require("../getEtapasPipeline");
  require("../getOportunidades");
  require("../createOportunidad");
  require("../getOportunidad");
  require("../avanzarEtapaOportunidad");
  require("../perderOportunidad");
  require("../getHistorialOportunidad");
  require("../pipelineCorsPreflight");

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

describe("pipeline routing -> operaciones", () => {
  test("registra exactamente las 7 operaciones del contrato", () => {
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

describe("pipeline routing -> preflight CORS", () => {
  test("cada operación tiene su OPTIONS en la misma ruta", () => {
    const rutasConPreflight = new Set(preflights().map((config) => config.route));

    for (const claveOperacion of OPERACIONES_ESPERADAS) {
      const ruta = claveOperacion.slice(claveOperacion.indexOf(" ") + 1);

      expect(rutasConPreflight.has(ruta)).toBe(true);
    }
  });

  test("el preflight no usa comodines y es anónimo", () => {
    // Siete operaciones sobre seis rutas distintas: GET y POST de
    // `pipeline/oportunidades` comparten un único preflight.
    const rutasDistintas = new Set(
      OPERACIONES_ESPERADAS.map((claveOperacion) =>
        claveOperacion.slice(claveOperacion.indexOf(" ") + 1),
      ),
    );

    expect(preflights().length).toBe(rutasDistintas.size);

    for (const config of preflights()) {
      expect(config.route).not.toContain("*");
      expect(config.authLevel).toBe("anonymous");
      expect(config.methods).toEqual(["OPTIONS"]);
    }
  });
});

describe("pipeline routing -> matriz de roles (paridad con el contrato)", () => {
  test("lectura: freelance, dirección comercial y gerencia general", () => {
    expect(PIPELINE_ROLES_LECTURA).toEqual([
      "ejecutivo_inversion",
      "direccion_comercial",
      "gerencia_general",
    ]);
  });

  test("escritura: exclusiva de freelance", () => {
    expect(PIPELINE_ROLES_ESCRITURA).toEqual(["ejecutivo_inversion"]);
  });
});
