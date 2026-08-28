import { describe, expect, it } from "vitest";
import { reduceToRange, selectByPrefixSum, totalWeight } from "../draw/selection";

const TWO_POW_64 = 1n << 64n;

describe("reduceToRange", () => {
  it("maps the whole 64-bit domain into [0, total)", () => {
    const total = 1_000n;
    for (const random of [0n, 1n, TWO_POW_64 / 2n, TWO_POW_64 - 1n]) {
      const target = reduceToRange(random, total);
      expect(target).toBeGreaterThanOrEqual(0n);
      expect(target).toBeLessThan(total);
    }
  });

  it("returns zero for a zero total instead of dividing by it", () => {
    // The protocol cannot branch on an encrypted total, so this case has to be
    // defined rather than guarded. See ADR-003.
    expect(reduceToRange(TWO_POW_64 - 1n, 0n)).toBe(0n);
  });

  it("is monotonic in the random input", () => {
    const total = 7n;
    let previous = -1n;
    for (let step = 0n; step < 64n; step += 1n) {
      const target = reduceToRange((TWO_POW_64 / 64n) * step, total);
      expect(target).toBeGreaterThanOrEqual(previous);
      previous = target;
    }
  });

  it("bounds the bias by total / 2^64", () => {
    // Each target receives floor(2^64/total) or ceil(2^64/total) preimages.
    // Checking the preimage count of the first and last targets is enough to
    // pin the spread, and it is exact rather than statistical.
    const total = 3n;
    const floorCount = TWO_POW_64 / total;

    const firstBoundary = countPreimages(0n, total);
    const lastBoundary = countPreimages(total - 1n, total);

    for (const count of [firstBoundary, lastBoundary]) {
      expect(count).toBeGreaterThanOrEqual(floorCount);
      expect(count).toBeLessThanOrEqual(floorCount + 1n);
    }
  });
});

/** Exact preimage count for a target, by inverting the multiply-high map. */
function countPreimages(target: bigint, total: bigint): bigint {
  const lower = ceilDiv(target * TWO_POW_64, total);
  const upper = ceilDiv((target + 1n) * TWO_POW_64, total);
  return upper - lower;
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

describe("selectByPrefixSum", () => {
  const entries = [
    { key: "a", weight: 100n },
    { key: "b", weight: 200n },
    { key: "c", weight: 700n },
  ];

  it("selects by half-open interval, matching the contract's comparisons", () => {
    expect(selectByPrefixSum(entries, 0n)).toBe("a");
    expect(selectByPrefixSum(entries, 99n)).toBe("a");
    // The boundary: 100 belongs to b, not a. An off-by-one here would be a
    // silent fairness bug rather than a visible failure.
    expect(selectByPrefixSum(entries, 100n)).toBe("b");
    expect(selectByPrefixSum(entries, 299n)).toBe("b");
    expect(selectByPrefixSum(entries, 300n)).toBe("c");
    expect(selectByPrefixSum(entries, 999n)).toBe("c");
  });

  it("returns null when the target is outside the total weight", () => {
    expect(selectByPrefixSum(entries, 1_000n)).toBeNull();
  });

  it("never selects a participant with zero weight", () => {
    const withZero = [
      { key: "empty", weight: 0n },
      { key: "funded", weight: 10n },
    ];
    for (let target = 0n; target < 10n; target += 1n) {
      expect(selectByPrefixSum(withZero, target)).toBe("funded");
    }
  });

  it("selects in proportion to weight across the full target space", () => {
    const counts = new Map<string, number>();
    const total = totalWeight(entries);
    const samples = 1_000;

    for (let index = 0; index < samples; index += 1) {
      // Sweep the target space deterministically rather than sampling randomly:
      // a fairness test that can flake teaches people to re-run it.
      const target = (total * BigInt(index)) / BigInt(samples);
      const winner = selectByPrefixSum(entries, target);
      if (winner) counts.set(winner, (counts.get(winner) ?? 0) + 1);
    }

    for (const entry of entries) {
      const expected = (samples * Number(entry.weight)) / Number(total);
      expect(counts.get(entry.key) ?? 0).toBeGreaterThanOrEqual(expected - 1);
      expect(counts.get(entry.key) ?? 0).toBeLessThanOrEqual(expected + 1);
    }
  });
});
