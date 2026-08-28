/**
 * A plaintext model of the encrypted weighted selection.
 *
 * This is the protocol's algorithm, written in the clear. It backs the mock
 * gateway — a mock that picked winners some other way would have the product
 * designed against behaviour the chain does not have — and it is the executable
 * statement of what the contract is expected to do, which is why it lives in the
 * domain layer and is tested directly.
 *
 * The protocol cannot compute `random mod total`, because `FHE.rem` takes a
 * plaintext divisor and the pool's total is encrypted. It uses a multiply-high
 * reduction instead — see the protocol research handoff — and so does this.
 */

const TWO_POW_64 = 1n << 64n;

/**
 * Reduces a uniform draw from `[0, 2^64)` into `[0, total)`.
 *
 * Each target receives either `floor(2^64 / total)` or `ceil(2^64 / total)`
 * preimages, so the distance from uniform is bounded by `total / 2^64`.
 */
export function reduceToRange(random64: bigint, total: bigint): bigint {
  if (total <= 0n) return 0n;
  return (random64 * total) / TWO_POW_64;
}

export type WeightedEntry<T> = {
  readonly key: T;
  readonly weight: bigint;
};

/**
 * Selects the entry whose cumulative interval contains `target`.
 *
 * The protocol walks every entry under encryption and cannot break early — it
 * must not leak the winner's position through gas. This model returns as soon as
 * it finds the winner, since leaking through a local loop is meaningless, but it
 * uses the identical half-open interval rule so that boundary behaviour matches:
 * entry `i` wins when `sum(j < i) <= target < sum(j <= i)`.
 */
export function selectByPrefixSum<T>(
  entries: readonly WeightedEntry<T>[],
  target: bigint,
): T | null {
  let cumulative = 0n;
  for (const entry of entries) {
    const lowerBound = cumulative;
    cumulative += entry.weight;
    if (target >= lowerBound && target < cumulative) return entry.key;
  }
  return null;
}

/** Total weight, matching the encrypted total the protocol accumulates. */
export function totalWeight<T>(entries: readonly WeightedEntry<T>[]): bigint {
  return entries.reduce((sum, entry) => sum + entry.weight, 0n);
}

/** A uniform 64-bit draw, standing in for `FHE.randEuint64()`. */
export function random64(): bigint {
  const high = BigInt(Math.floor(Math.random() * 0x1_0000_0000)) << 32n;
  const low = BigInt(Math.floor(Math.random() * 0x1_0000_0000));
  return high | low;
}
