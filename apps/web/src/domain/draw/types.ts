import type { CiphertextHandle } from "../privacy/confidential";

/**
 * The public draw lifecycle.
 *
 * `sealing` exists because the encrypted prefix scan may not fit in one
 * transaction — see ADR-002 and the HCU budget in the protocol research
 * handoff. If the protocol ships an atomic draw the state is simply never
 * observed, and no UI has to change.
 */
export type DrawStatus =
  /** Accepting deposits; the draw cannot run yet. */
  | "open"
  /** The scheduled time has passed. Anyone may seal the draw. */
  | "ready"
  /** The encrypted scan is in progress across one or more transactions. */
  | "sealing"
  /** Selection is complete. Winnings are credited but still encrypted. */
  | "awarded";

export type DrawProgress = {
  readonly processed: number;
  readonly total: number;
};

export type Draw = {
  readonly id: number;
  readonly status: DrawStatus;
  /** Unix seconds at which the draw becomes `ready`. */
  readonly opensAt: number;
  readonly closesAt: number;
  /** Prize for this draw, in base units. Public, so solvency is verifiable. */
  readonly prize: bigint;
  readonly participantCount: number;
  /**
   * Present only while `status === "sealing"`. A determinate progress model
   * beats a spinner: the user can see the scan advancing.
   */
  readonly progress?: DrawProgress;
  /** The transaction that sealed this draw, for the verification link. */
  readonly sealTransaction?: `0x${string}`;
};

/** A past draw as this user can safely reconstruct it. */
export type DrawResult = {
  readonly drawId: number;
  readonly prize: bigint;
  readonly participantCount: number;
  readonly settledAt: number;
  /**
   * The change in this user's encrypted winnings across the draw.
   *
   * The user decrypts this themselves. The app never infers a winner from
   * claim activity or from any public event.
   */
  readonly winningsDelta: CiphertextHandle;
};

export function isSealable(draw: Draw): boolean {
  return draw.status === "ready" || draw.status === "sealing";
}

/** Seconds until the draw becomes sealable, floored at zero. */
export function secondsUntilReady(draw: Draw, nowSeconds: number): number {
  return Math.max(0, draw.closesAt - nowSeconds);
}

export function progressRatio(draw: Draw): number | null {
  if (!draw.progress || draw.progress.total === 0) return null;
  return draw.progress.processed / draw.progress.total;
}
