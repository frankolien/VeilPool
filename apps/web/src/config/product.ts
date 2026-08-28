/**
 * Product constants.
 *
 * Copy that appears in more than one place lives here so the landing page and
 * the app cannot drift apart, and so a claim can be changed in one edit when the
 * protocol changes.
 */

export const PRODUCT = {
  name: "VEIL Pool",
  tagline: "Save privately. Win privately. Keep every dollar you deposit.",
  summary:
    "A prize-linked savings pool where your balance, your odds and your winnings stay encrypted on-chain — and your principal is always yours to withdraw.",
} as const;

/**
 * Preset savings goals.
 *
 * The goal is stored locally and compared against a value the user has already
 * decrypted. It never leaves the browser and is never sent on-chain.
 */
export const SAVINGS_GOAL_PRESETS: readonly bigint[] = [
  100_000_000n, // 100
  500_000_000n, // 500
  1_000_000_000n, // 1,000
  5_000_000_000n, // 5,000
];

/** Faucet mint size, in base units. Large enough to exercise the whole flow. */
export const FAUCET_MINT_AMOUNT = 1_000_000_000n; // 1,000 USDT

/**
 * How long a decryption authorisation lasts.
 *
 * Zama's legacy EIP-712 permit requires whole-day increments. The permit and
 * plaintexts remain memory-only and are cleared on disconnect or reload, so the
 * app does not retain this full protocol validity window locally.
 */
export const DECRYPTION_SESSION_SECONDS = 86_400;

/** Default ERC-7984 operator window offered when authorising the pool. */
export const OPERATOR_APPROVAL_DAYS = 30;
