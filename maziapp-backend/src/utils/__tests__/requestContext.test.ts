import { HttpRequest, InvocationContext } from "@azure/functions";

import {
  contextoActual,
  ejecutarConContexto,
  establecerUsuarioEnContexto,
  extraerDireccionIp,
  extraerUserAgent,
} from "../requestContext";
import { withCors } from "../../middleware/withCors";

function makeReq(headers: Record<string, string> = {}): HttpRequest {
  return {
    method: "GET",
    url: "http://localhost:7071/api/test",
    headers: new Headers(headers),
    query: new URLSearchParams(),
    params: {},
  } as unknown as HttpRequest;
}

function makeCtx(invocationId = "inv-default-12345"): InvocationContext {
  return {
    invocationId,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext;
}

describe("requestContext (S40)", () => {
  test("fuera de una solicitud devuelve undefined", () => {
    expect(contextoActual()).toBeUndefined();
  });

  test("propaga correlación, IP, user-agent y usuario a través de promesas", async () => {
    const capturado = await ejecutarConContexto(
      {
        correlationId: "corr-test-001",
        direccionIp: "192.0.2.10",
        userAgent: "Jest/29",
      },
      async () => {
        await Promise.resolve();
        establecerUsuarioEnContexto({
          oid: "11111111-1111-1111-1111-111111111111",
          name: "Ana",
          roles: ["compliance"],
        });
        await new Promise((r) => setImmediate(r));
        return contextoActual();
      },
    );

    expect(capturado).toEqual({
      correlationId: "corr-test-001",
      direccionIp: "192.0.2.10",
      userAgent: "Jest/29",
      usuario: {
        oid: "11111111-1111-1111-1111-111111111111",
        name: "Ana",
        roles: ["compliance"],
      },
    });
    expect(contextoActual()).toBeUndefined();
  });

  test("extraerDireccionIp acepta IPv4, IPv4 con puerto e IPv6, y rechaza basura", () => {
    expect(
      extraerDireccionIp(makeReq({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(
      extraerDireccionIp(makeReq({ "x-azure-clientip": "198.51.100.4:54321" })),
    ).toBe("198.51.100.4");
    expect(
      extraerDireccionIp(makeReq({ "x-forwarded-for": "2001:db8::1" })),
    ).toBe("2001:db8::1");
    expect(
      extraerDireccionIp(makeReq({ "x-forwarded-for": "no-es-una-ip; DROP TABLE" })),
    ).toBeNull();
    expect(extraerDireccionIp(makeReq())).toBeNull();
  });

  test("extraerUserAgent recorta a 300 caracteres y devuelve null cuando está vacío", () => {
    expect(extraerUserAgent(makeReq())).toBeNull();
    expect(extraerUserAgent(makeReq({ "user-agent": "   " }))).toBeNull();

    const largo = "Mozilla/5.0 ".repeat(40);
    const truncado = extraerUserAgent(makeReq({ "user-agent": largo }));

    expect(truncado).toHaveLength(300);
  });

  test("withCors inyecta X-Correlation-Id en la respuesta y abre el contexto", async () => {
    let vistoEnHandler: string | undefined;

    const handler = withCors(async () => {
      vistoEnHandler = contextoActual()?.correlationId;
      return { status: 200, jsonBody: { ok: true } };
    });

    const resConHeader = await handler(
      makeReq({ "x-correlation-id": "corr-cliente-99" }),
      makeCtx("inv-fallback"),
    );

    expect(vistoEnHandler).toBe("corr-cliente-99");
    expect((resConHeader.headers as Record<string, string>)["X-Correlation-Id"]).toBe(
      "corr-cliente-99",
    );

    const resSinHeader = await handler(makeReq(), makeCtx("inv-fallback-2"));
    expect((resSinHeader.headers as Record<string, string>)["X-Correlation-Id"]).toBe(
      "inv-fallback-2",
    );
  });
});
