import { correlationIdPathSchema } from "../saga.validator";

describe("saga.validator (S4)", () => {
  test("acepta correlationId de 8 a 64 caracteres permitidos y rechaza el resto", () => {
    expect(correlationIdPathSchema.safeParse("corr-12345678").success).toBe(
      true,
    );
    expect(correlationIdPathSchema.safeParse("corto").success).toBe(false);
    expect(correlationIdPathSchema.safeParse("con espacios").success).toBe(
      false,
    );
  });
});
