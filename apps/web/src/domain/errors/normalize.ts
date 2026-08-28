import { type ProductError, type ProductErrorCode, productError } from "./taxonomy";

/**
 * Turns anything thrown by wagmi, viem, the FHE SDK or a contract into a
 * `ProductError`.
 *
 * Matching is done on stable signals — custom error selectors and error names —
 * before falling back to message text, which providers reword between releases.
 * When nothing matches, the result is `unknown`, which tells the user we cannot
 * confirm their transaction did not go through. That is the honest answer and it
 * is why `unknown` is not treated as a bug to be pattern-matched away.
 */

/**
 * Custom errors the pool and its dependencies revert with.
 *
 * Keyed by name rather than selector so this table stays readable; viem surfaces
 * the decoded name whenever the ABI is available, which it is for our own calls.
 */
const CONTRACT_ERROR_CODES: Readonly<Record<string, ProductErrorCode>> = {
  // VEIL Pool
  DrawNotReady: "draw-not-ready",
  DrawInProgress: "draw-in-progress",
  PrizeReserveInsufficient: "prize-reserve-insufficient",
  ParticipantLimitReached: "participant-limit-reached",
  ParticipantCapacityReached: "participant-limit-reached",
  DepositsArePaused: "draw-in-progress",
  DrawsArePaused: "draw-in-progress",
  // ERC-7984 / OpenZeppelin confidential contracts
  ERC7984UnauthorizedSpender: "missing-operator-approval",
  ERC7984ZeroBalance: "insufficient-confidential",
  ERC7984InvalidReceiver: "transaction-reverted",
  // ERC-20
  ERC20InsufficientBalance: "insufficient-underlying",
  ERC20InsufficientAllowance: "missing-erc20-approval",
  // FHEVM host contracts
  ACLNotAllowed: "missing-acl-permission",
  SenderNotAllowed: "missing-acl-permission",
  InvalidInputProof: "invalid-encrypted-proof",
  InvalidType: "encrypted-type-mismatch",
};

const PROVIDER_ERROR_CODES: Readonly<Record<string, ProductErrorCode>> = {
  InsufficientFundsError: "insufficient-gas",
  ChainMismatchError: "wrong-network",
  ConnectorNotConnectedError: "wallet-disconnected",
  UserRejectedRequestError: "user-rejected-transaction",
};

/** Ordered: the first match wins, so specific patterns precede general ones. */
const MESSAGE_PATTERNS: readonly (readonly [RegExp, ProductErrorCode])[] = [
  [/user rejected|user denied|rejected the request|action_rejected/i, "user-rejected-transaction"],
  [/signature.*(rejected|denied)|rejected.*signature/i, "user-rejected-signature"],
  [
    /insufficient funds|exceeds (?:the )?balance of (?:the )?account|not enough funds|insufficient balance.*(?:gas|fee)|gas required exceeds allowance/i,
    "insufficient-gas",
  ],
  [/chain mismatch|unsupported chain|wrong network/i, "wrong-network"],
  [/not connected|no account|connector not found/i, "wallet-disconnected"],
  [/rate ?limit|429|too many requests/i, "rpc-rate-limited"],
  [/transaction was replaced|replacement transaction/i, "transaction-replaced"],
  [/relayer|gateway timeout|503|502/i, "relayer-unavailable"],
  [/permit.*expired|decryption.*expired|expired.*permit/i, "decryption-expired"],
  [/durationSeconds.*whole number of days|multiple of 86400/i, "decryption-configuration-invalid"],
  [/input ?proof|zk ?proof/i, "invalid-encrypted-proof"],
  [/execution reverted|call revert/i, "transaction-reverted"],
];

/**
 * Signature rejections and transaction rejections arrive with the same wallet
 * error code, so the caller tells us which prompt was open.
 */
export type ErrorContext = "transaction" | "signature";

export function normalizeError(cause: unknown, context: ErrorContext = "transaction"): ProductError {
  if (isProductError(cause)) return cause;

  const message = extractMessage(cause);
  const technical = message.slice(0, 500);

  const contractCode = matchContractError(cause, message);
  if (contractCode) return productError(contractCode, technical);

  for (const [pattern, code] of MESSAGE_PATTERNS) {
    if (!pattern.test(message)) continue;
    if (code === "user-rejected-transaction" && context === "signature") {
      return productError("user-rejected-signature", technical);
    }
    return productError(code, technical);
  }

  return productError("unknown", technical);
}

function matchContractError(cause: unknown, message: string): ProductErrorCode | null {
  for (const current of errorChain(cause)) {
    const named = readString(current, "name");
    if (named && named in CONTRACT_ERROR_CODES) return CONTRACT_ERROR_CODES[named] ?? null;
    if (named && named in PROVIDER_ERROR_CODES) return PROVIDER_ERROR_CODES[named] ?? null;
  }

  // viem nests the decoded custom error; the name still appears in the message.
  for (const [name, code] of Object.entries(CONTRACT_ERROR_CODES)) {
    if (message.includes(name)) return code;
  }
  return null;
}

/** viem wraps provider errors several layers deep; the actionable name is often on `cause`. */
function errorChain(value: unknown): readonly unknown[] {
  const chain: unknown[] = [];
  let current: unknown = value;
  for (let depth = 0; depth < 8 && typeof current === "object" && current !== null; depth += 1) {
    chain.push(current);
    current = (current as Record<string, unknown>).cause;
  }
  return chain;
}

function isProductError(value: unknown): value is ProductError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "fundsImpact" in value &&
    "recovery" in value
  );
}

function extractMessage(cause: unknown): string {
  if (typeof cause === "string") return cause;
  if (cause instanceof Error) {
    // viem stacks context in `shortMessage` / `details`; both are useful here.
    const short = readString(cause, "shortMessage");
    const details = readString(cause, "details");
    return [short, details, cause.message].filter(Boolean).join(" — ");
  }
  if (typeof cause === "object" && cause !== null) {
    const message = readString(cause, "message");
    if (message) return message;
  }
  return String(cause);
}

function readString(value: unknown, key: string): string | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

/**
 * Strips a `ProductError` down to what may safely leave the browser.
 *
 * `technical` is dropped: revert data and SDK payloads can embed ciphertext
 * handles, addresses and request bodies. Per the sensitive-data policy, nothing
 * derived from a user's financial state is reportable, so telemetry receives the
 * classification and nothing else.
 */
export function toTelemetrySafe(error: ProductError): {
  readonly code: ProductErrorCode;
  readonly fundsImpact: ProductError["fundsImpact"];
  readonly recovery: ProductError["recovery"];
} {
  return { code: error.code, fundsImpact: error.fundsImpact, recovery: error.recovery };
}
