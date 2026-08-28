import { getAddress, isAddress, ZeroAddress } from "ethers";

export type DeploymentConfig = {
  confidentialToken: `0x${string}`;
  owner: `0x${string}`;
  prizePerDraw: bigint;
  drawPeriodSeconds: number;
};

export function readDeploymentConfig(env: NodeJS.ProcessEnv = process.env): DeploymentConfig {
  const token = requiredAddress(env.CONFIDENTIAL_TOKEN_ADDRESS, "CONFIDENTIAL_TOKEN_ADDRESS");
  const owner = requiredAddress(env.OWNER_ADDRESS, "OWNER_ADDRESS");
  const prizePerDraw = requiredPositiveBigInt(env.PRIZE_PER_DRAW, "PRIZE_PER_DRAW");
  const drawPeriodSeconds = requiredPositiveInteger(
    env.DRAW_PERIOD_SECONDS,
    "DRAW_PERIOD_SECONDS",
  );

  if (prizePerDraw > (1n << 64n) - 1n) {
    throw new Error("PRIZE_PER_DRAW exceeds the euint64 domain");
  }
  if (drawPeriodSeconds < 300) {
    throw new Error("DRAW_PERIOD_SECONDS must be at least 300");
  }
  if (drawPeriodSeconds > 2 ** 48 - 1) {
    throw new Error("DRAW_PERIOD_SECONDS exceeds uint48");
  }

  return { confidentialToken: token, owner, prizePerDraw, drawPeriodSeconds };
}

export function requiredAddress(value: string | undefined, label: string): `0x${string}` {
  if (!value || !isAddress(value)) throw new Error(`${label} must be a valid address`);
  const normalized = getAddress(value) as `0x${string}`;
  if (normalized === ZeroAddress) throw new Error(`${label} cannot be the zero address`);
  return normalized;
}

function requiredPositiveBigInt(value: string | undefined, label: string): bigint {
  if (!value || !/^\d+$/.test(value)) throw new Error(`${label} must be a positive integer`);
  const parsed = BigInt(value);
  if (parsed <= 0n) throw new Error(`${label} must be positive`);
  return parsed;
}

function requiredPositiveInteger(value: string | undefined, label: string): number {
  if (!value || !/^\d+$/.test(value)) throw new Error(`${label} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
  return parsed;
}
