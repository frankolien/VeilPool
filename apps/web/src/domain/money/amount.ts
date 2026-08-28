/**
 * Fixed-point token arithmetic.
 *
 * Every token in VEIL Pool is six-decimal (USDT, cUSDT, and the pool's own
 * accounting all agree on this). Values are carried as `bigint` base units and
 * are never converted to `number` for arithmetic — only for layout decisions
 * that cannot affect a displayed figure.
 */

/** Decimals shared by USDT, cUSDT, and pool accounting. See ADR-001. */
export const TOKEN_DECIMALS = 6;

const ONE_UNIT = 10n ** BigInt(TOKEN_DECIMALS);

/**
 * The pool's encrypted accounting is `euint64`, so no single balance may exceed
 * `2^64 - 1` base units. Inputs are validated against this before encryption:
 * an overflowing ciphertext would be accepted by the wallet and then behave
 * unpredictably on-chain.
 */
export const MAX_TOKEN_AMOUNT = 2n ** 64n - 1n;

export type ParseFailure =
  | "empty"
  | "not-a-number"
  | "negative"
  | "too-many-decimals"
  | "exceeds-max";

export type ParsedAmount =
  | { readonly ok: true; readonly value: bigint }
  | { readonly ok: false; readonly reason: ParseFailure };

const AMOUNT_PATTERN = /^\d*(?:\.\d*)?$/;

/**
 * Parses user input into base units without ever touching a float.
 *
 * Rejects rather than rounds when the input carries more precision than the
 * token can represent — silently truncating "10.0000001" into "10" is a
 * financial UI failure, not a formatting convenience.
 */
export function parseAmount(input: string): ParsedAmount {
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === ".") return { ok: false, reason: "empty" };
  if (trimmed.startsWith("-")) return { ok: false, reason: "negative" };
  if (!AMOUNT_PATTERN.test(trimmed)) return { ok: false, reason: "not-a-number" };

  const [wholePart = "", fractionPart = ""] = trimmed.split(".");
  if (fractionPart.length > TOKEN_DECIMALS) {
    return { ok: false, reason: "too-many-decimals" };
  }

  const paddedFraction = fractionPart.padEnd(TOKEN_DECIMALS, "0");
  const value =
    BigInt(wholePart === "" ? "0" : wholePart) * ONE_UNIT + BigInt(paddedFraction);

  if (value > MAX_TOKEN_AMOUNT) return { ok: false, reason: "exceeds-max" };
  return { ok: true, value };
}

export type FormatOptions = {
  /** Trailing zeros are dropped by default; aligned tables may want them kept. */
  readonly trailingZeros?: boolean;
  /** Group the whole part with separators. Defaults to true. */
  readonly grouped?: boolean;
  /** Cap the fraction shown. Never rounds up past the true value. */
  readonly maxFractionDigits?: number;
};

/**
 * Formats base units for display. Truncates rather than rounds, so a displayed
 * balance is never larger than the balance actually held.
 */
export function formatAmount(value: bigint, options: FormatOptions = {}): string {
  const { trailingZeros = false, grouped = true, maxFractionDigits = TOKEN_DECIMALS } = options;

  const negative = value < 0n;
  const absolute = negative ? -value : value;

  const wholeText = grouped
    ? groupDigits((absolute / ONE_UNIT).toString())
    : (absolute / ONE_UNIT).toString();

  const visibleDigits = Math.max(0, Math.min(maxFractionDigits, TOKEN_DECIMALS));
  let fractionText = (absolute % ONE_UNIT)
    .toString()
    .padStart(TOKEN_DECIMALS, "0")
    .slice(0, visibleDigits);
  if (!trailingZeros) fractionText = fractionText.replace(/0+$/, "");

  const body = fractionText === "" ? wholeText : `${wholeText}.${fractionText}`;
  return negative ? `-${body}` : body;
}

/** `formatAmount` with the token symbol appended, for prose and receipts. */
export function formatWithSymbol(
  value: bigint,
  symbol: string,
  options: FormatOptions = {},
): string {
  return `${formatAmount(value, options)} ${symbol}`;
}

function groupDigits(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Basis points of `part` within `total`, or `null` when the total is zero.
 *
 * Used for the savings-goal ring and for locally computed odds — both of which
 * operate on values the user has already decrypted, never on ciphertext.
 */
export function basisPoints(part: bigint, total: bigint): number | null {
  if (total <= 0n) return null;
  return Number((part * 10_000n) / total);
}

/** Percentage derived from basis points, so no float ever enters the ratio. */
export function formatPercent(bps: number, fractionDigits = 1): string {
  return `${(bps / 100).toFixed(fractionDigits)}%`;
}
