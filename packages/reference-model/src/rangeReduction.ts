function assertRandomInDomain(random: bigint, randomBits: number): void {
  if (!Number.isSafeInteger(randomBits) || randomBits <= 0 || randomBits > 256) {
    throw new RangeError("randomBits must be an integer in [1, 256]");
  }

  const domain = 1n << BigInt(randomBits);
  if (random < 0n || random >= domain) {
    throw new RangeError("random value is outside the declared bit domain");
  }
}

function assertPositiveTotal(total: bigint): void {
  if (total <= 0n) throw new RangeError("total must be positive");
}

/** Maps a uniform k-bit integer with encrypted-remainder semantics. */
export function reduceByRemainder(random: bigint, total: bigint, randomBits: number): bigint {
  assertRandomInDomain(random, randomBits);
  assertPositiveTotal(total);
  return random % total;
}

/** Maps a uniform k-bit integer using floor(random * total / 2^k). */
export function reduceByMultiplyHigh(
  random: bigint,
  total: bigint,
  randomBits: number,
): bigint {
  assertRandomInDomain(random, randomBits);
  assertPositiveTotal(total);
  return (random * total) >> BigInt(randomBits);
}

/**
 * Maximum absolute probability error of any output bucket from exact 1/total.
 * Both candidate reducers distribute a power-of-two domain among `total`
 * buckets whose sizes differ by at most one.
 */
export function maxBucketProbabilityError(total: bigint, randomBits: number): number {
  assertPositiveTotal(total);
  assertRandomInDomain(0n, randomBits);

  const domain = 1n << BigInt(randomBits);
  if (total > domain) {
    throw new RangeError("total cannot exceed the random domain");
  }

  const lowerBucketSize = domain / total;
  const upperBucketSize = lowerBucketSize + (domain % total === 0n ? 0n : 1n);
  const ideal = 1 / Number(total);
  const lower = Number(lowerBucketSize) / Number(domain);
  const upper = Number(upperBucketSize) / Number(domain);
  return Math.max(Math.abs(lower - ideal), Math.abs(upper - ideal));
}

/** Upper bound on total variation distance from uniform. */
export function totalVariationUpperBound(total: bigint, randomBits: number): number {
  return (Number(total) * maxBucketProbabilityError(total, randomBits)) / 2;
}
