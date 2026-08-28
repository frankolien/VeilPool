import { describe, expect, it } from "vitest";
import { normalizeError, toTelemetrySafe } from "../errors/normalize";
import { ERROR_CATALOGUE } from "../errors/taxonomy";

describe("normalizeError", () => {
  it("maps a decoded contract error by name", () => {
    expect(normalizeError(new Error("reverted with custom error 'DrawNotReady()'")).code).toBe(
      "draw-not-ready",
    );
    expect(
      normalizeError(new Error("ERC20InsufficientAllowance(0x…, 0, 100)")).code,
    ).toBe("missing-erc20-approval");
  });

  it("distinguishes a declined signature from a declined transaction", () => {
    const message = "User rejected the request.";
    expect(normalizeError(new Error(message), "transaction").code).toBe(
      "user-rejected-transaction",
    );
    expect(normalizeError(new Error(message), "signature").code).toBe("user-rejected-signature");
  });

  it("reads viem's shortMessage and details", () => {
    const cause = Object.assign(new Error("wrapped"), {
      shortMessage: "The request took too long to respond.",
      details: "relayer returned 503",
    });
    expect(normalizeError(cause).code).toBe("relayer-unavailable");
  });

  it("recognises wallet gas failures across provider wording", () => {
    expect(
      normalizeError(new Error("The total cost of executing this transaction exceeds the balance of the account.")).code,
    ).toBe("insufficient-gas");
  });

  it("walks viem's nested cause chain for the actionable provider error", () => {
    const provider = Object.assign(new Error("provider rejected request"), {
      name: "InsufficientFundsError",
    });
    const wrapped = Object.assign(new Error("Contract function execution failed"), {
      cause: Object.assign(new Error("wallet request failed"), { cause: provider }),
    });
    expect(normalizeError(wrapped).code).toBe("insufficient-gas");
  });

  it("classifies an invalid Zama permit duration as a safe local configuration failure", () => {
    const error = normalizeError(
      new Error("durationSeconds must be a whole number of days (a multiple of 86400 seconds), got 1800"),
      "signature",
    );
    expect(error.code).toBe("decryption-configuration-invalid");
    expect(error.fundsImpact).toBe("untouched");
  });

  it("falls back to unknown rather than guessing", () => {
    const error = normalizeError(new Error("something entirely unrecognised"));
    expect(error.code).toBe("unknown");
    // The point of the fallback: it must not claim the funds are safe.
    expect(error.fundsImpact).toBe("unknown");
  });

  it("passes an already-normalised error straight through", () => {
    const original = normalizeError(new Error("User rejected the request."));
    expect(normalizeError(original)).toBe(original);
  });

  it("keeps the raw message out of telemetry", () => {
    const error = normalizeError(new Error("handle 0xdeadbeef decrypts to 4200000"));
    expect(error.technical).toContain("0xdeadbeef");
    expect(Object.values(toTelemetrySafe(error)).join(" ")).not.toContain("0xdeadbeef");
    expect(toTelemetrySafe(error)).not.toHaveProperty("technical");
  });
});

describe("error catalogue", () => {
  it("gives every code an actionable next step", () => {
    for (const [code, template] of Object.entries(ERROR_CATALOGUE)) {
      expect(template.code, `${code} is keyed consistently`).toBe(code);
      expect(template.nextAction.length, `${code} has a next action`).toBeGreaterThan(0);
      expect(template.title.length, `${code} has a title`).toBeGreaterThan(0);
    }
  });
});
