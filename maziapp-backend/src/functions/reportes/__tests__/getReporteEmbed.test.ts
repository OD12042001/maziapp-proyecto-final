/**
 * getReporteEmbed (Function)
 *
 * Mockea `validateToken` (no depende de JWKS/Entra ID real) y
 * `reporte.service` (no depende de Azure SQL real). Prueba el
 * CABLEADO Function -> withAuth -> obtenerReporte, y en particular que
 * la autorización se decide ÚNICAMENTE a partir de los roles del JWT
 * ya validado (`user.roles`) — nunca de un valor que el cliente pueda
 * enviar en la request (query, body, headers custom) — lo que
 * demuestra que no existe una vía de autorización "solo de frontend".
 */
import { getReporteEmbed } from "../getReporteEmbed";
import * as reporteService from "../../../services/reportes/reporte.service";
import * as validateTokenModule from "../../../utils/validateToken";

jest.mock("../../../services/reportes/reporte.service");
jest.mock("../../../utils/validateToken", () => ({
  validateToken: jest.fn(),
}));

const mockObtenerReporte = reporteService.obtenerReporte as jest.Mock;

function buildRequest(opts: {
  authHeader?: string;
  key?: string;
  spoofedRoles?: string[];
}) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? opts.authHeader ?? null : null,
    },
    params: { key: opts.key ?? "avance_ejecutivas" },
    // Intento deliberado (solo para la prueba) de que el cliente envíe
    // sus propios "roles" en la query string, como si pudiera influir
    // en la autorización. La Function nunca lee `query` para roles —
    // esta prueba lo confirma.
    query: opts.spoofedRoles
      ? new Map([["roles", opts.spoofedRoles.join(",")]])
      : new Map(),
  } as any;
}

const context = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

describe("getReporteEmbed (Function)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("sin token -> 401", async () => {
    const req = buildRequest({});
    const res = await getReporteEmbed(req, context);
    expect(res.status).toBe(401);
    expect(mockObtenerReporte).not.toHaveBeenCalled();
  });

  test("reporte inexistente -> 404", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["direccion_comercial"],
    });
    mockObtenerReporte.mockResolvedValue({ ok: false, status: 404 });

    const req = buildRequest({ authHeader: "Bearer token-valido", key: "no_existe" });
    const res = await getReporteEmbed(req, context);
    expect(res.status).toBe(404);
  });

  test("rol no autorizado -> 403", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"],
    });
    mockObtenerReporte.mockResolvedValue({ ok: false, status: 403 });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getReporteEmbed(req, context);
    expect(res.status).toBe(403);
  });

  test("rol autorizado -> 200 con la URL", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["direccion_comercial"],
    });
    mockObtenerReporte.mockResolvedValue({
      ok: true,
      url: "https://app.powerbi.com/view?r=...",
    });

    const req = buildRequest({ authHeader: "Bearer token-valido" });
    const res = await getReporteEmbed(req, context);
    expect(res.status).toBe(200);
    expect((res.jsonBody as any).url).toContain("powerbi.com");
  });

  test("la autorización usa exclusivamente los roles del JWT validado, ignorando cualquier rol enviado por el cliente", async () => {
    (validateTokenModule.validateToken as jest.Mock).mockResolvedValue({
      oid: "user-1",
      roles: ["ejecutivo_inversion"], // el JWT real NO tiene direccion_comercial
    });
    mockObtenerReporte.mockResolvedValue({ ok: false, status: 403 });

    // El cliente intenta colar un rol con privilegios vía query string.
    const req = buildRequest({
      authHeader: "Bearer token-valido",
      spoofedRoles: ["gerencia_general"],
    });

    const res = await getReporteEmbed(req, context);

    // obtenerReporte se llamó con los roles del JWT (["ejecutivo_inversion"]),
    // nunca con el valor que el cliente intentó inyectar en la query.
    expect(mockObtenerReporte).toHaveBeenCalledWith("avance_ejecutivas", [
      "ejecutivo_inversion",
    ]);
    expect(res.status).toBe(403);
  });
});
