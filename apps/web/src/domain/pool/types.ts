import type { Address } from "viem";
import type { ConfidentialValue } from "../privacy/confidential";
import type { Draw } from "../draw/types";

/**
 * Everything about the pool that is public by construction.
 *
 * Nothing here is encrypted: if a field belongs in this type, an observer can
 * already read it. Encrypted pool state (total principal) is deliberately absent
 * — the app has no ACL grant for it and must never pretend otherwise.
 */
export type PoolState = {
  readonly address: Address;
  readonly asset: AssetDescriptor;
  readonly draw: Draw;
  /**
   * Prize liquidity available to fund draws, in base units.
   *
   * On Sepolia this is a funded demo reserve, not yield. `isDemoReserve` carries
   * that fact into the type so no screen can render it as real yield by accident.
   */
  readonly prizeReserve: bigint;
  /** Whether `prizeReserve` is public or an encrypted, undisclosed ledger. */
  readonly prizeReserveVisibility: "public" | "encrypted";
  readonly isDemoReserve: boolean;
  readonly participantCount: number;
  /**
   * Hard cap on participants per draw, set by the FHE cost of the encrypted
   * scan. Public, and shown to the user before the pool fills.
   */
  readonly participantCap: number;
};

export type AssetDescriptor = {
  readonly underlying: TokenDescriptor;
  readonly confidential: TokenDescriptor;
};

export type TokenDescriptor = {
  readonly address: Address;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
};

/**
 * The connected wallet's position.
 *
 * Balances outside the pool (public USDT, confidential cUSDT) are wallet state;
 * principal and winnings are pool state. They are grouped here because the
 * dashboard reasons about them together, and separating them would push the
 * join into every consumer.
 */
export type UserState = {
  readonly address: Address;
  /** Public ERC-20 balance. Visible to everyone, including this app. */
  readonly underlyingBalance: bigint;
  /** ERC-20 allowance granted to the wrapper. Public. */
  readonly wrapperAllowance: bigint;
  /** Confidential token balance held outside the pool. */
  readonly confidentialBalance: ConfidentialValue;
  /** Principal inside the pool. Withdrawable in full; never used as prize money. */
  readonly principal: ConfidentialValue;
  /** Winnings credited by past draws and not yet claimed. */
  readonly unclaimedWinnings: ConfidentialValue;
  readonly isParticipant: boolean;
  /**
   * The first draw this account's principal counts toward.
   *
   * Deposits land after the current draw's participant set is fixed, so a fresh
   * deposit is not eligible for the draw it lands in. The dashboard shows this
   * as pending rather than silently counting it.
   */
  readonly eligibleFromDrawId: number;
  /** Whether the pool is authorised to move this account's cUSDT. */
  readonly hasPoolOperatorApproval: boolean;
};

export function isEligibleForDraw(user: UserState, draw: Draw): boolean {
  return user.isParticipant && user.eligibleFromDrawId <= draw.id;
}

/** True when the pool cannot admit another participant this draw. */
export function isPoolAtCapacity(pool: PoolState): boolean {
  return pool.participantCount >= pool.participantCap;
}

/**
 * Whether the reserve can actually pay the advertised prize.
 *
 * Mock mode can compare a disclosed reserve. Production keeps the reserve
 * encrypted, so the contract—not the UI—performs the coverage check while the
 * interface reports the balance as undisclosed.
 */
export function isPrizeFunded(pool: PoolState): boolean {
  return pool.prizeReserveVisibility === "encrypted" || pool.prizeReserve >= pool.draw.prize;
}
