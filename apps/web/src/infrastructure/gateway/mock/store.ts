import type { Address } from "viem";
import type { Draw } from "@/domain/draw/types";
import { reduceToRange, random64, selectByPrefixSum, totalWeight } from "@/domain/draw/selection";

/**
 * In-memory protocol simulation backing `MockPoolGateway`.
 *
 * Deliberately behaves like the chain where behaviour is observable: encrypted
 * transfers clamp to the available balance instead of reverting, deposits are
 * not eligible for the draw they land in, and the participant cap is enforced.
 * Where the chain is merely slow, the mock is fast.
 */

export type MockParticipant = {
  principal: bigint;
  unclaimedWinnings: bigint;
  eligibleFromDrawId: number;
  /** Bumped on every mutation so derived handles move like real ones. */
  epoch: number;
};

export type MockAccount = {
  underlyingBalance: bigint;
  confidentialBalance: bigint;
  wrapperAllowance: bigint;
  poolOperatorUntil: number;
  epoch: number;
};

/** Sepolia's encrypted scan bounds each draw. See ADR-002. */
export const MOCK_PARTICIPANT_CAP = 20;

const DRAW_INTERVAL_SECONDS = 180;
const MOCK_PRIZE = 25_000_000n; // 25 USDT
const MOCK_RESERVE_SEED = 500_000_000n; // 500 USDT

/**
 * Demo participants.
 *
 * Present so that the draw has a meaningful weight distribution and the
 * participant count is not "1". Their addresses are obviously synthetic and the
 * UI labels the whole dataset as demo data — they must never read as real users.
 */
const DEMO_PARTICIPANTS: readonly (readonly [Address, bigint])[] = [
  ["0xDe0000000000000000000000000000000000d001", 420_000_000n],
  ["0xDe0000000000000000000000000000000000d002", 180_000_000n],
  ["0xDe0000000000000000000000000000000000d003", 95_500_000n],
  ["0xDe0000000000000000000000000000000000d004", 1_250_000_000n],
  ["0xDe0000000000000000000000000000000000d005", 60_000_000n],
];

export type SettledDraw = {
  readonly drawId: number;
  readonly prize: bigint;
  readonly participantCount: number;
  readonly settledAt: number;
  readonly winner: Address | null;
  /** Per-account credit from this draw. Zero for everyone but the winner. */
  readonly credits: ReadonlyMap<Address, bigint>;
};

export class MockPoolStore {
  readonly accounts = new Map<Address, MockAccount>();
  readonly participants = new Map<Address, MockParticipant>();
  readonly settledDraws: SettledDraw[] = [];

  prizeReserve = MOCK_RESERVE_SEED;
  drawId = 1;
  drawStatus: Draw["status"] = "open";
  drawOpensAt: number;
  drawClosesAt: number;
  scanCursor = 0;
  sealTransaction: `0x${string}` | undefined;

  constructor(now = Math.floor(Date.now() / 1000)) {
    this.drawOpensAt = now;
    this.drawClosesAt = now + DRAW_INTERVAL_SECONDS;
    for (const [address, principal] of DEMO_PARTICIPANTS) {
      this.participants.set(address, {
        principal,
        unclaimedWinnings: 0n,
        eligibleFromDrawId: 1,
        epoch: 0,
      });
    }
  }

  account(address: Address): MockAccount {
    const existing = this.accounts.get(address);
    if (existing) return existing;
    const created: MockAccount = {
      underlyingBalance: 0n,
      confidentialBalance: 0n,
      wrapperAllowance: 0n,
      poolOperatorUntil: 0,
      epoch: 0,
    };
    this.accounts.set(address, created);
    return created;
  }

  participant(address: Address): MockParticipant | null {
    return this.participants.get(address) ?? null;
  }

  get prize(): bigint {
    return MOCK_PRIZE;
  }

  get participantCount(): number {
    return this.participants.size;
  }

  /** Advances `open → ready` once the timer elapses. Called on every read. */
  tick(now: number): void {
    if (this.drawStatus === "open" && now >= this.drawClosesAt) {
      this.drawStatus = "ready";
    }
  }

  /**
   * Runs the encrypted scan for one batch of participants.
   *
   * Returns `true` when the scan is complete. The batching mirrors the HCU bound
   * on the real scan: the winner is decided when the draw is sealed, but crediting
   * every participant takes more than one transaction.
   */
  advanceScan(batchSize: number, now: number): boolean {
    const eligible = this.eligibleParticipants();

    if (this.drawStatus === "ready") {
      this.drawStatus = "sealing";
      this.scanCursor = 0;
      this.pendingWinner = this.drawWinner(eligible);
    }

    this.scanCursor = Math.min(this.scanCursor + batchSize, eligible.length);
    if (this.scanCursor < eligible.length) return false;

    this.settleDraw(eligible, now);
    return true;
  }

  private pendingWinner: Address | null = null;

  private eligibleParticipants(): readonly (readonly [Address, MockParticipant])[] {
    return [...this.participants.entries()].filter(
      ([, participant]) =>
        participant.eligibleFromDrawId <= this.drawId && participant.principal > 0n,
    );
  }

  /**
   * Picks the winner with the protocol's algorithm.
   *
   * `null` when the pool has no eligible weight — the protocol has to define this
   * case explicitly rather than let a zero total select participant zero.
   */
  private drawWinner(
    eligible: readonly (readonly [Address, MockParticipant])[],
  ): Address | null {
    const entries = eligible.map(([address, participant]) => ({
      key: address,
      weight: participant.principal,
    }));
    const total = totalWeight(entries);
    if (total === 0n) return null;
    return selectByPrefixSum(entries, reduceToRange(random64(), total));
  }

  private settleDraw(
    eligible: readonly (readonly [Address, MockParticipant])[],
    now: number,
  ): void {
    const winner = this.pendingWinner;
    const credits = new Map<Address, bigint>();

    const funded = this.prizeReserve >= MOCK_PRIZE;
    if (winner && funded) {
      const participant = this.participants.get(winner);
      if (participant) {
        participant.unclaimedWinnings += MOCK_PRIZE;
        participant.epoch += 1;
      }
      this.prizeReserve -= MOCK_PRIZE;
      credits.set(winner, MOCK_PRIZE);
    }

    this.settledDraws.push({
      drawId: this.drawId,
      prize: funded ? MOCK_PRIZE : 0n,
      participantCount: eligible.length,
      settledAt: now,
      winner: funded ? winner : null,
      credits,
    });

    this.drawStatus = "awarded";
    this.pendingWinner = null;
  }

  /** Opens the next draw. Everything eligible now stays eligible. */
  openNextDraw(now: number): void {
    this.drawId += 1;
    this.drawStatus = "open";
    this.drawOpensAt = now;
    this.drawClosesAt = now + DRAW_INTERVAL_SECONDS;
    this.scanCursor = 0;
    this.sealTransaction = undefined;
  }

  get scanTotal(): number {
    return this.eligibleParticipants().length;
  }
}
