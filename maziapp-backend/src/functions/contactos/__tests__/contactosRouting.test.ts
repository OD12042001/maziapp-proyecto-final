/**
 * Fase Actividad -- corrección de routing (bug real reportado en
 * producción: GET /api/contactos/empresas?search=CRECE devolvía 404
 * porque `contactos/{id?}` sin restricción capturaba "empresas" como
 * si fuera un id).
 *
 * Este archivo NO puede probar el enrutamiento real HTTP del host de
 * Azure Functions (eso lo resuelve el runtime de `func start` /
 * Azure, fuera del alcance de Jest -- ver informe de la corrección).
 * Lo que SÍ prueba, con evidencia real y verificable, es la
 * CONFIGURACIÓN que cada Function le entrega a `app.http(...)`: qué
 * `route` y qué `methods` quedaron registrados después del fix, para
 * cada uno de los archivos tocados (y, como control de no-regresión,
 * para `getEmpresas.ts`, que NO se modificó).
 *
 * Mockea `@azure/functions` únicamente para capturar esos argumentos
 * -- no reemplaza lógica de negocio de ningún handler (cada handler
 * real se sigue probando en su propio *.test.ts, con id="21", etc.).
 *
 * Nota técnica: las llamadas a `app.http(...)` ocurren UNA sola vez,
 * al importar cada módulo (efecto de carga, no de cada test). Como
 * este proyecto usa `clearMocks: true` (jest.config.js), el historial
 * del mock se borra antes de cada test individual -- por eso las
 * registraciones se capturan una única vez en `beforeAll` a una
 * estructura propia (`registros`), en vez de leer
 * `(app.http as jest.Mock).mock.calls` dentro de cada test.
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

// Mocks mínimos para poder importar los archivos sin tocar Azure SQL
// real (mismo criterio que getContactos.test.ts/getEmpresas.test.ts).
jest.mock("../../../services/contactos/contacto.service", () => ({}));
jest.mock("../../../services/contactos/empresaBusqueda.service", () => ({}));
jest.mock("../../../utils/validateToken", () => ({ validateToken: jest.fn() }));

import { app } from "@azure/functions";

type Registro = { methods: string[]; route: string };

const registros: Record<string, Registro> = {};

beforeAll(() => {
  require("../getContactos");
  require("../updateContacto");
  require("../corsPreflight");
  require("../empresasCorsPreflight");
  require("../getEmpresas");

  for (const call of (app.http as jest.Mock).mock.calls) {
    const [name, config] = call as [string, Registro];
    registros[name] = config;
  }
});

function configDe(functionName: string): Registro {
  const config = registros[functionName];

  if (!config) {
    throw new Error(`app.http nunca fue llamado con el nombre "${functionName}"`);
  }

  return config;
}

describe("Routing de Contactos -- configuración registrada en app.http tras el fix", () => {
  test("A/D) getContactos (GET) queda restringido a contactos/{id:int?} -- 'empresas' ya no matchea un id", () => {
    const config = configDe("getContactos");
    expect(config.route).toBe("contactos/{id:int?}");
    expect(config.methods).toEqual(["GET"]);
  });

  test("updateContacto (PATCH) queda restringido a contactos/{id:int?} (misma corrección, mismo criterio)", () => {
    const config = configDe("updateContacto");
    expect(config.route).toBe("contactos/{id:int?}");
    expect(config.methods).toEqual(["PATCH"]);
  });

  test("C) el preflight general (OPTIONS) de Contactos también queda restringido a contactos/{id:int?}", () => {
    const config = configDe("contactosCorsPreflight");
    expect(config.route).toBe("contactos/{id:int?}");
    expect(config.methods).toEqual(["OPTIONS"]);
  });

  test("C) OPTIONS /api/contactos/empresas ahora tiene su propio preflight dedicado (empresasCorsPreflight)", () => {
    const config = configDe("empresasCorsPreflight");
    expect(config.route).toBe("contactos/empresas");
    expect(config.methods).toEqual(["OPTIONS"]);
  });

  test("B) No-regresión: getEmpresas (GET) conserva exactamente su contrato -- route y methods sin cambios", () => {
    const config = configDe("getEmpresas");
    expect(config.route).toBe("contactos/empresas");
    expect(config.methods).toEqual(["GET"]);
  });

  test("D) Las plantillas de contactos/{id:int?} y contactos/empresas ya no son ambiguas entre sí para el mismo método", () => {
    // Verificación de configuración: para GET, la única función con
    // plantilla parametrizada es getContactos, y quedó con
    // restricción numérica -- "empresas" no es un entero, por lo que
    // (según la semántica de constraints documentada por el extension
    // bundle de Azure Functions v4, [4.*, 5.0.0), que este proyecto
    // usa -- ver host.json/package.json) el host ya no debería
    // ofrecerla como candidata para "/contactos/empresas". Esto NO
    // reemplaza la prueba manual real contra `func start` (ver
    // "Pruebas pendientes" del informe) -- es la prueba de
    // configuración más fuerte disponible sin un host HTTP real.
    const getContactosConfig = configDe("getContactos");
    const getEmpresasConfig = configDe("getEmpresas");

    expect(getContactosConfig.route).not.toBe(getEmpresasConfig.route);
    expect(getContactosConfig.route).toBe("contactos/{id:int?}");
    expect(getEmpresasConfig.route).toBe("contactos/empresas");
  });
});
