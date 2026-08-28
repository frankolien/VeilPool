import { describe, expect, it } from "vitest";
import { PrizePoolModel } from "./model.js";
import {
  maxBucketProbabilityError,
  reduceByMultiplyHigh,
  reduceByRemainder,
} from "./rangeReduction.js";
import { selectWeightedIndex } from "./weightedSelection.js";

describe("weighted interval selection", () => {
  it("maps every target to the expected interval", () => {
    const weights = [10n, 30n, 60n];

    for (let target = 0n; target < 100n; target += 1n) {
      const winner = selectWeightedIndex(weights, target).winnerIndex;
      expect(winner).toBe(target < 10n ? 0 : target < 40n ? 1 : 2);
    }
  });

  it("skips zero-weight participants", () => {
    expect(selectWeightedIndex([0n, 5n, 0n], 0n).winnerIndex).toBe(1);
    expect(selectWeightedIndex([0n, 5n, 0n], 4n).winnerIndex).toBe(1);
  });

  it("rejects invalid totals and targets", () => {
    expect(() => selectWeightedIndex([0n, 0n], 0n)).toThrow(/zero total/);
    expect(() => selectWeightedIndex([1n], 1n)).toThrow(/target/);
    expect(() => selectWeightedIndex([-1n], 0n)).toThrow(/non-negative/);
  });
});

describe("random range reduction", () => {
  it("keeps both candidates inside the target range", () => {
    for (let random = 0n; random < 256n; random += 1n) {
      expect(reduceByRemainder(random, 37n, 8)).toBeGreaterThanOrEqual(0n);
      expect(reduceByRemainder(random, 37n, 8)).toBeLessThan(37n);
      expect(reduceByMultiplyHigh(random, 37n, 8)).toBeGreaterThanOrEqual(0n);
      expect(reduceByMultiplyHigh(random, 37n, 8)).toBeLessThan(37n);
    }
  });

  it("computes zero bias when the target divides the random domain", () => {
    expect(maxBucketProbabilityError(16n, 8)).toBe(0);
  });
});

describe("prize pool accounting model", () => {
  it("preserves principal through draw and claim", () => {
    const pool = new PrizePoolModel();
    pool.fundReserve(1_000n);
    pool.deposit("alice", 10n);
    pool.deposit("bob", 30n);
    pool.deposit("carol", 60n);

    const principalBefore = pool.totalPrincipal;
    const result = pool.award(100n, 39n);

    expect(result.winner).toBe("bob");
    expect(pool.totalPrincipal).toBe(principalBefore);
    expect(pool.account("bob").principal).toBe(30n);
    expect(pool.account("bob").winnings).toBe(100n);
    expect(pool.claim("bob")).toBe(100n);
    expect(pool.claim("bob")).toBe(0n);
    expect(pool.totalPrincipal).toBe(principalBefore);
  });

  it("models privacy-safe over-withdrawal as a zero transfer", () => {
    const pool = new PrizePoolModel();
    pool.deposit("alice", 50n);

    expect(pool.withdraw("alice", 51n)).toBe(0n);
    expect(pool.account("alice").principal).toBe(50n);
    expect(pool.withdraw("alice", 50n)).toBe(50n);
    expect(pool.account("alice").principal).toBe(0n);
  });

  it("prevents duplicate awards", () => {
    const pool = new PrizePoolModel();
    pool.fundReserve(20n);
    pool.deposit("alice", 1n);
    pool.award(10n, 0n);

    expect(() => pool.award(10n, 0n)).toThrow(/already awarded/);
  });
});
