/**
 * The product error taxonomy.
 *
 * Chain errors arrive as prose written for developers. A user reading a failure
 * in a savings product needs four answers, and needs them without reading a
 * stack trace:
 *
 *   1. what happened
 *   2. whether their money moved
 *   3. whether trying again is safe
 *   4. what to do next
 *
 * Every code below answers all four. "Whether their money moved" is the one that
 * cannot be guessed: a normaliser that cannot establish it must say `"unknown"`
 * rather than reassure.
 */

export type ProductErrorCode =
  // Connection and network
  | "wallet-disconnected"
  | "wrong-network"
  | "insufficient-gas"
  // Balances and permissions
  | "insufficient-underlying"
  | "insufficient-confidential"
  | "missing-erc20-approval"
  | "missing-operator-approval"
  | "missing-acl-permission"
  // User choices
  | "user-rejected-transaction"
  | "user-rejected-signature"
  // Encrypted input and decryption
  | "invalid-encrypted-proof"
  | "encryption-preparation-failed"
  | "encrypted-type-mismatch"
  | "zero-ciphertext-handle"
  | "decryption-expired"
  | "decryption-configuration-invalid"
  | "relayer-unavailable"
  // Pool rules
  | "draw-not-ready"
  | "draw-in-progress"
  | "prize-reserve-insufficient"
  | "participant-limit-reached"
  | "transfer-resolved-to-zero"
  // Transport
  | "rpc-rate-limited"
  | "transaction-replaced"
  | "transaction-reverted"
  | "refresh-failed-after-confirmation"
  | "unknown";

/** What this failure did to the user's money. */
export type FundsImpact =
  /** Nothing was submitted. Balances are untouched. */
  | "untouched"
  /** A transaction reverted, so state rolled back. Only gas was spent. */
  | "reverted-gas-only"
  /** Funds moved before the failure. The UI must say what and where. */
  | "moved"
  /** Cannot be established from the error alone. Never guess this one. */
  | "unknown";

/** Whether repeating the same action is safe, and under what condition. */
export type Recovery =
  /** Safe to retry as-is. */
  | "retry"
  /** Retry only after the stated fix. */
  | "fix-then-retry"
  /** Retry later; the cause is transient and outside the user's control. */
  | "wait"
  /** Retrying will not help. */
  | "no-retry";

export type ProductError = {
  readonly code: ProductErrorCode;
  /** One line, in the user's terms. */
  readonly title: string;
  /** What happened, without jargon and without blame. */
  readonly detail: string;
  readonly fundsImpact: FundsImpact;
  readonly recovery: Recovery;
  /** The single next thing to do. Imperative, one action. */
  readonly nextAction: string;
  /** Original message, shown only behind a disclosure and never sent anywhere. */
  readonly technical?: string;
};

type ErrorTemplate = Omit<ProductError, "technical">;

export const ERROR_CATALOGUE: Readonly<Record<ProductErrorCode, ErrorTemplate>> = {
  "wallet-disconnected": {
    code: "wallet-disconnected",
    title: "Wallet not connected",
    detail: "VEIL Pool needs a connected wallet to read your private position.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Connect your wallet",
  },
  "wrong-network": {
    code: "wrong-network",
    title: "Wrong network",
    detail: "VEIL Pool runs on Sepolia. Your wallet is pointed somewhere else.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Switch to Sepolia",
  },
  "insufficient-gas": {
    code: "insufficient-gas",
    title: "Not enough Sepolia ETH",
    detail: "Sepolia ETH pays for gas. It has no value and is free to obtain.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Get Sepolia ETH from a faucet",
  },

  "insufficient-underlying": {
    code: "insufficient-underlying",
    title: "Not enough USDT",
    detail: "This amount is larger than your public USDT balance.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Mint test USDT, or lower the amount",
  },
  "insufficient-confidential": {
    code: "insufficient-confidential",
    title: "Not enough cUSDT",
    detail:
      "This amount is larger than your confidential balance. Because the balance is encrypted, the pool cannot check it before you sign — the transfer would resolve to zero on-chain.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Shield more USDT, or lower the amount",
  },
  "missing-erc20-approval": {
    code: "missing-erc20-approval",
    title: "Wrapper not approved",
    detail: "Shielding moves USDT on your behalf, which needs a one-time ERC-20 approval.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Approve the wrapper, then shield",
  },
  "missing-operator-approval": {
    code: "missing-operator-approval",
    title: "Pool not authorised",
    detail:
      "Depositing lets the pool move your confidential tokens. ERC-7984 calls this an operator approval, and it expires on a date you choose.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Authorise the pool, then deposit",
  },
  "missing-acl-permission": {
    code: "missing-acl-permission",
    title: "Not authorised to decrypt this value",
    detail:
      "The protocol grants decryption rights per value. This one is not currently granted to your address, which usually means the position has not been created yet.",
    fundsImpact: "untouched",
    recovery: "no-retry",
    nextAction: "Refresh your position",
  },

  "user-rejected-transaction": {
    code: "user-rejected-transaction",
    title: "Transaction cancelled",
    detail: "You dismissed the request in your wallet. Nothing was sent.",
    fundsImpact: "untouched",
    recovery: "retry",
    nextAction: "Try again when you are ready",
  },
  "user-rejected-signature": {
    code: "user-rejected-signature",
    title: "Signature declined",
    detail:
      "Revealing an encrypted value needs your signature. It authorises decryption only — it cannot move funds.",
    fundsImpact: "untouched",
    recovery: "retry",
    nextAction: "Try revealing again",
  },

  "invalid-encrypted-proof": {
    code: "invalid-encrypted-proof",
    title: "Encrypted input rejected",
    detail:
      "The proof accompanying your encrypted amount did not verify. This normally means the input was built for a different account or contract.",
    fundsImpact: "reverted-gas-only",
    recovery: "retry",
    nextAction: "Try again — a fresh encrypted input will be built",
  },
  "encryption-preparation-failed": {
    code: "encryption-preparation-failed",
    title: "Could not prepare the encrypted amount",
    detail:
      "Encryption stopped in your browser before the wallet was asked to sign. No transaction was submitted.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Reload the app, then try encryption again",
  },
  "encrypted-type-mismatch": {
    code: "encrypted-type-mismatch",
    title: "Encrypted value has the wrong type",
    detail: "The contract expected a different encrypted width than the one supplied.",
    fundsImpact: "reverted-gas-only",
    recovery: "no-retry",
    nextAction: "Reload the app to pick up the current contract interface",
  },
  "zero-ciphertext-handle": {
    code: "zero-ciphertext-handle",
    title: "Nothing to reveal yet",
    detail:
      "There is no ciphertext behind this value. It is not a balance of zero — the position simply has not been created.",
    fundsImpact: "untouched",
    recovery: "no-retry",
    nextAction: "Make a deposit to open your position",
  },
  "decryption-expired": {
    code: "decryption-expired",
    title: "Reveal session expired",
    detail:
      "Decryption is authorised for a limited window so that a signature cannot be reused indefinitely. Yours has lapsed.",
    fundsImpact: "untouched",
    recovery: "fix-then-retry",
    nextAction: "Sign again to reveal",
  },
  "decryption-configuration-invalid": {
    code: "decryption-configuration-invalid",
    title: "Reveal configuration is invalid",
    detail:
      "The app could not create a valid EIP-712 decryption permit. No transaction was submitted and no funds moved.",
    fundsImpact: "untouched",
    recovery: "no-retry",
    nextAction: "Reload the app to use the corrected reveal configuration",
  },
  "relayer-unavailable": {
    code: "relayer-unavailable",
    title: "Decryption service unreachable",
    detail:
      "The Zama relayer handles encryption and decryption requests. It did not respond. Your funds are unaffected — this only blocks reading values.",
    fundsImpact: "untouched",
    recovery: "wait",
    nextAction: "Try again in a moment",
  },

  "draw-not-ready": {
    code: "draw-not-ready",
    title: "Draw is not ready",
    detail: "This draw is still open. It can be sealed once its timer reaches zero.",
    fundsImpact: "untouched",
    recovery: "wait",
    nextAction: "Wait for the countdown",
  },
  "draw-in-progress": {
    code: "draw-in-progress",
    title: "Draw is being sealed",
    detail:
      "The encrypted scan is running. Deposits and withdrawals resume as soon as it finishes.",
    fundsImpact: "untouched",
    recovery: "wait",
    nextAction: "Wait for the draw to finish",
  },
  "prize-reserve-insufficient": {
    code: "prize-reserve-insufficient",
    title: "Prize reserve is short",
    detail:
      "The reserve cannot cover this draw's prize, so the draw will not run. Principal is unaffected and remains withdrawable.",
    fundsImpact: "untouched",
    recovery: "wait",
    nextAction: "Wait for the reserve to be funded",
  },
  "participant-limit-reached": {
    code: "participant-limit-reached",
    title: "Pool is full for this draw",
    detail:
      "The encrypted draw scans every participant, so each draw admits a fixed number of wallets. You can join the next one.",
    fundsImpact: "untouched",
    recovery: "wait",
    nextAction: "Wait for the next draw to open",
  },
  "transfer-resolved-to-zero": {
    code: "transfer-resolved-to-zero",
    title: "Transfer moved nothing",
    detail:
      "The transaction succeeded but the encrypted transfer resolved to zero, which happens when the requested amount exceeds the encrypted balance. Confidential tokens fail this way instead of reverting, because reverting would reveal the balance.",
    fundsImpact: "reverted-gas-only",
    recovery: "fix-then-retry",
    nextAction: "Reveal your balance, then retry with an amount within it",
  },

  "rpc-rate-limited": {
    code: "rpc-rate-limited",
    title: "Network is rate limiting us",
    detail: "The Sepolia RPC endpoint is throttling requests.",
    fundsImpact: "unknown",
    recovery: "wait",
    nextAction: "Wait a few seconds, then refresh",
  },
  "transaction-replaced": {
    code: "transaction-replaced",
    title: "Transaction was replaced",
    detail:
      "Your wallet replaced this transaction, usually by speeding it up or cancelling it. The replacement may still have succeeded.",
    fundsImpact: "unknown",
    recovery: "fix-then-retry",
    nextAction: "Check your wallet activity before retrying",
  },
  "transaction-reverted": {
    code: "transaction-reverted",
    title: "Transaction failed on-chain",
    detail: "The contract rejected the call, so nothing changed apart from gas.",
    fundsImpact: "reverted-gas-only",
    recovery: "fix-then-retry",
    nextAction: "Refresh your position and try again",
  },

  "refresh-failed-after-confirmation": {
    code: "refresh-failed-after-confirmation",
    title: "Transaction confirmed — display not refreshed",
    detail:
      "The transaction was included on-chain, but VEIL could not reload the latest balances. Do not submit it again.",
    fundsImpact: "moved",
    recovery: "no-retry",
    nextAction: "Refresh the page to read the confirmed state",
  },

  unknown: {
    code: "unknown",
    title: "Something went wrong",
    detail:
      "We could not identify this failure, so we cannot promise your transaction did not go through.",
    fundsImpact: "unknown",
    recovery: "fix-then-retry",
    nextAction: "Check your wallet activity before retrying",
  },
};

export function productError(
  code: ProductErrorCode,
  technical?: string,
): ProductError {
  const template = ERROR_CATALOGUE[code];
  return technical === undefined ? template : { ...template, technical };
}

/** Errors where restating the balance would help the user more than the message. */
export function suggestsReveal(error: ProductError): boolean {
  return (
    error.code === "transfer-resolved-to-zero" || error.code === "insufficient-confidential"
  );
}
