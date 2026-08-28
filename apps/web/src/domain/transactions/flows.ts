import type { FlowStep } from "./flow";
import type { WriteStage } from "../pool/gateway";

/**
 * The concrete flows.
 *
 * Every protocol action the user can take is declared here as an ordered step
 * list. Declaring them in one file — rather than inside each feature — keeps the
 * language consistent ("Encrypting your amount" means the same thing everywhere)
 * and makes the whole surface reviewable in one read.
 */

// ---- Deposit --------------------------------------------------------------

export type DepositStepId = "validate" | "authorize" | "encrypt" | "sign" | "confirm" | "refresh";

export const DEPOSIT_STEPS: readonly FlowStep<DepositStepId>[] = [
  { id: "validate", active: "Checking your amount", done: "Amount checked" },
  {
    id: "authorize",
    active: "Authorising the pool",
    done: "Pool authorised",
    optional: true,
  },
  { id: "encrypt", active: "Encrypting your amount", done: "Amount encrypted" },
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Confirming on Sepolia", done: "Confirmed on Sepolia" },
  { id: "refresh", active: "Refreshing your private balance", done: "Balance refreshed" },
];

// ---- Shield ---------------------------------------------------------------

export type ShieldStepId = "validate" | "approve" | "sign" | "confirm" | "refresh";

export const SHIELD_STEPS: readonly FlowStep<ShieldStepId>[] = [
  { id: "validate", active: "Checking your amount", done: "Amount checked" },
  { id: "approve", active: "Approving the wrapper", done: "Wrapper approved", optional: true },
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Confirming on Sepolia", done: "Confirmed on Sepolia" },
  { id: "refresh", active: "Refreshing your balances", done: "Balances refreshed" },
];

// ---- Withdraw -------------------------------------------------------------

export type WithdrawStepId = "validate" | "encrypt" | "sign" | "confirm" | "refresh";

export const WITHDRAW_STEPS: readonly FlowStep<WithdrawStepId>[] = [
  { id: "validate", active: "Checking your amount", done: "Amount checked" },
  { id: "encrypt", active: "Encrypting your amount", done: "Amount encrypted" },
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Confirming on Sepolia", done: "Confirmed on Sepolia" },
  { id: "refresh", active: "Refreshing your private balance", done: "Balance refreshed" },
];

// ---- Claim ----------------------------------------------------------------

export type ClaimStepId = "sign" | "confirm" | "refresh";

export const CLAIM_STEPS: readonly FlowStep<ClaimStepId>[] = [
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Confirming on Sepolia", done: "Confirmed on Sepolia" },
  { id: "refresh", active: "Refreshing your winnings", done: "Winnings refreshed" },
];

// ---- Draw -----------------------------------------------------------------

export type DrawStepId = "sign" | "confirm" | "scan" | "refresh";

export const DRAW_STEPS: readonly FlowStep<DrawStepId>[] = [
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Sealing the draw", done: "Draw sealed" },
  {
    id: "scan",
    active: "Selecting a winner under encryption",
    done: "Winner selected under encryption",
  },
  { id: "refresh", active: "Refreshing the draw", done: "Draw complete" },
];

// ---- Decryption -----------------------------------------------------------

/**
 * Revealing a value.
 *
 * `authorize` is the EIP-712 signature. It is a step of its own, and never
 * triggered automatically, because an unexplained wallet popup in a savings
 * product reads as an attempt to move money.
 */
export type RevealStepId = "prepare" | "authorize" | "request" | "decrypt";

export const REVEAL_STEPS: readonly FlowStep<RevealStepId>[] = [
  { id: "prepare", active: "Preparing your reveal key", done: "Reveal key ready" },
  {
    id: "authorize",
    active: "Waiting for your signature",
    done: "Reveal authorised",
    optional: true,
  },
  { id: "request", active: "Requesting your ciphertext", done: "Ciphertext received" },
  { id: "decrypt", active: "Decrypting in your browser", done: "Revealed to you only" },
];

// ---- Gateway stage bridging ----------------------------------------------

/**
 * Maps a gateway `WriteStage` onto a flow step.
 *
 * The gateway reports protocol-level stages; flows are product-level. Keeping
 * the translation in one function means adding a stage cannot silently leave a
 * flow stuck on the wrong step.
 */
export function stageToStep<Id extends string>(
  stage: WriteStage,
  mapping: Readonly<Record<WriteStage, Id | null>>,
): Id | null {
  return mapping[stage];
}

export const WRITE_STAGE_TO_DEPOSIT_STEP: Readonly<Record<WriteStage, DepositStepId | null>> = {
  encrypting: "encrypt",
  "awaiting-wallet": "sign",
  confirming: "confirm",
  refreshing: "refresh",
};

// Prize funding has the same cryptographic and operator-authorisation boundary
// as a deposit, but credits the isolated prize ledger instead of principal.
export const PRIZE_FUNDING_STEPS: readonly FlowStep<DepositStepId>[] = [
  { id: "validate", active: "Checking the contribution", done: "Contribution checked" },
  { id: "authorize", active: "Authorising the pool", done: "Pool authorised", optional: true },
  { id: "encrypt", active: "Encrypting the contribution", done: "Contribution encrypted" },
  { id: "sign", active: "Waiting for your wallet", done: "Signed" },
  { id: "confirm", active: "Funding the reserve on Sepolia", done: "Reserve funded on Sepolia" },
  { id: "refresh", active: "Refreshing pool state", done: "Pool state refreshed" },
];

export const WRITE_STAGE_TO_PRIZE_FUNDING_STEP = WRITE_STAGE_TO_DEPOSIT_STEP;

export const WRITE_STAGE_TO_SHIELD_STEP: Readonly<Record<WriteStage, ShieldStepId | null>> = {
  encrypting: null,
  "awaiting-wallet": "sign",
  confirming: "confirm",
  refreshing: "refresh",
};

export const WRITE_STAGE_TO_WITHDRAW_STEP: Readonly<Record<WriteStage, WithdrawStepId | null>> = {
  encrypting: "encrypt",
  "awaiting-wallet": "sign",
  confirming: "confirm",
  refreshing: "refresh",
};

export const WRITE_STAGE_TO_CLAIM_STEP: Readonly<Record<WriteStage, ClaimStepId | null>> = {
  encrypting: null,
  "awaiting-wallet": "sign",
  confirming: "confirm",
  refreshing: "refresh",
};

export const WRITE_STAGE_TO_DRAW_STEP: Readonly<Record<WriteStage, DrawStepId | null>> = {
  encrypting: null,
  "awaiting-wallet": "sign",
  confirming: "confirm",
  refreshing: "refresh",
};
