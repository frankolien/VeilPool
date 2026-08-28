import { describe, expect, it } from "vitest";
import {
  MAX_TOKEN_AMOUNT,
  basisPoints,
  formatAmount,
  formatPercent,
  parseAmount,
} from "../money/amount";

describe("parseAmount", () => {
  it("parses whole and fractional input into base units", () => {
    expect(parseAmount("1")).toEqual({ ok: true, value: 1_000_000n });
    expect(parseAmount("0.5")).toEqual({ ok: true, value: 500_000n });
    expect(parseAmount("1234.567891")).toEqual({ ok: true, value: 1_234_567_891n });
  });

  it("accepts the shapes people actually type", () => {
    expect(parseAmount(" 10 ")).toEqual({ ok: true, value: 10_000_000n });
    expect(parseAmount(".5")).toEqual({ ok: true, value: 500_000n });
    expect(parseAmount("5.")).toEqual({ ok: true, value: 5_000_000n });
  });

  it("rejects precision it cannot represent rather than truncating it", () => {
    // Silently dropping the seventh decimal would move a user's money by an
    // amount they typed and the UI acknowledged.
    expect(parseAmount("1.0000001")).toEqual({ ok: false, reason: "too-many-decimals" });
  });

  it("rejects values beyond euint64", () => {
    const overflowing = (MAX_TOKEN_AMOUNT / 1_000_000n + 1n).toString();
    expect(parseAmount(overflowing)).toEqual({ ok: false, reason: "exceeds-max" });
  });

  it("rejects malformed input", () => {
    expect(parseAmount("")).toEqual({ ok: false, reason: "empty" });
    expect(parseAmount("-1")).toEqual({ ok: false, reason: "negative" });
    expect(parseAmount("1e6")).toEqual({ ok: false, reason: "not-a-number" });
    expect(parseAmount("1.2.3")).toEqual({ ok: false, reason: "not-a-number" });
    expect(parseAmount("abc")).toEqual({ ok: false, reason: "not-a-number" });
  });

  it("round-trips through formatAmount", () => {
    for (const input of ["0.000001", "1", "999.999999", "1000000"]) {
      const parsed = parseAmount(input);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parseAmount(formatAmount(parsed.value, { grouped: false }))).toEqual(parsed);
    }
  });
});

describe("formatAmount", () => {
  it("groups the whole part and trims trailing zeros", () => {
    expect(formatAmount(1_234_567_890n)).toBe("1,234.56789");
    expect(formatAmount(1_000_000n)).toBe("1");
  });

  it("truncates rather than rounds, so a displayed balance is never overstated", () => {
    expect(formatAmount(1_999_999n, { maxFractionDigits: 2 })).toBe("1.99");
  });

  it("keeps trailing zeros when asked, for aligned columns", () => {
    expect(formatAmount(1_500_000n, { trailingZeros: true })).toBe("1.500000");
  });

  it("handles zero and negative values", () => {
    expect(formatAmount(0n)).toBe("0");
    expect(formatAmount(-1_500_000n)).toBe("-1.5");
  });
});

describe("basisPoints", () => {
  it("returns null for a zero total instead of dividing by zero", () => {
    expect(basisPoints(5n, 0n)).toBeNull();
  });

  it("computes a share without floating point", () => {
    expect(basisPoints(1n, 4n)).toBe(2500);
    expect(formatPercent(basisPoints(1n, 3n) ?? 0)).toBe("33.3%");
  });
});
