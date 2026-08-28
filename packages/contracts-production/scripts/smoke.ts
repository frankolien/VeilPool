import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";
import { requiredAddress } from "./config";

async function main() {
  if (network.name !== "sepolia" && network.name !== "mainnet") {
    throw new Error("Smoke test requires --network sepolia or --network mainnet");
  }
  const poolAddress = requiredAddress(
    process.env.POOL_ADDRESS ?? await poolFromManifest(network.name),
    "POOL_ADDRESS",
  );
  const code = await ethers.provider.getCode(poolAddress);
  if (code === "0x") throw new Error("POOL_ADDRESS has no deployed bytecode");

  const pool = await ethers.getContractAt("ConfidentialPrizePool", poolAddress);
  const [asset, owner, currentDrawId, nextDrawAt, prizePerDraw, participantCount, maxParticipants, depositsPaused, drawsPaused] =
    await Promise.all([
      pool.asset(),
      pool.owner(),
      pool.currentDrawId(),
      pool.nextDrawAt(),
      pool.prizePerDraw(),
      pool.participantCount(),
      pool.MAX_PARTICIPANTS(),
      pool.depositsPaused(),
      pool.drawsPaused(),
    ]);

  const expectedAsset = network.name === "mainnet"
    ? "0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50"
    : "0x4E7B06D78965594eB5EF5414c357ca21E1554491";
  if (asset.toLowerCase() !== expectedAsset.toLowerCase()) {
    throw new Error(`Unexpected pool asset: ${asset}`);
  }
  if (network.name === "mainnet" && (await ethers.provider.getCode(owner)) === "0x") {
    throw new Error("Mainnet pool owner is not a deployed smart account or multisig");
  }

  if (currentDrawId === 0n) throw new Error("Invalid zero draw ID");
  if (prizePerDraw === 0n) throw new Error("Invalid zero prize");
  if (nextDrawAt === 0n) throw new Error("Invalid zero next-draw timestamp");
  if (maxParticipants !== 20n) throw new Error(`Unexpected participant cap: ${maxParticipants}`);

  console.log(
    JSON.stringify(
      {
        pool: poolAddress,
        asset,
        owner,
        currentDrawId: currentDrawId.toString(),
        nextDrawAt: nextDrawAt.toString(),
        prizePerDraw: prizePerDraw.toString(),
        participantCount: participantCount.toString(),
        maxParticipants: maxParticipants.toString(),
        depositsPaused,
        drawsPaused,
      },
      null,
      2,
    ),
  );
}

async function poolFromManifest(networkName: "sepolia" | "mainnet"): Promise<string | undefined> {
  try {
    const manifest = JSON.parse(await readFile(resolve("deployments", `${networkName}.json`), "utf8")) as { pool?: unknown };
    return typeof manifest.pool === "string" ? manifest.pool : undefined;
  } catch {
    return undefined;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
