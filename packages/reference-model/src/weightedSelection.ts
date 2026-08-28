export type WeightedSelection = {
  winnerIndex: number;
  target: bigint;
  totalWeight: bigint;
};

export function sumWeights(weights: readonly bigint[]): bigint {
  return weights.reduce((sum, weight) => {
    if (weight < 0n) throw new RangeError("weights must be non-negative");
    return sum + weight;
  }, 0n);
}

export function selectWeightedIndex(
  weights: readonly bigint[],
  target: bigint,
): WeightedSelection {
  const totalWeight = sumWeights(weights);

  if (totalWeight === 0n) throw new RangeError("cannot select from zero total weight");
  if (target < 0n || target >= totalWeight) {
    throw new RangeError("target must be in [0, totalWeight)");
  }

  let cumulative = 0n;
  for (let index = 0; index < weights.length; index += 1) {
    const weight = weights[index];
    if (weight === undefined) throw new Error("unreachable missing weight");

    cumulative += weight;
    if (target < cumulative) {
      return { winnerIndex: index, target, totalWeight };
    }
  }

  throw new Error("weighted selection invariant violated");
}
