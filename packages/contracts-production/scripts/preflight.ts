import { ethers, network } from "hardhat";
import { readDeploymentConfig } from "./config";

const NETWORKS = {
  sepolia: { chainId: 11_155_111, officialCUsdt: "0x4E7B06D78965594eB5EF5414c357ca21E1554491" },
  mainnet: { chainId: 1, officialCUsdt: "0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50" },
} as const;

async function main() {
  if (network.name !== "sepolia" && network.name !== "mainnet") {
    throw new Error("Preflight requires --network sepolia or --network mainnet");
  }

  const profile = NETWORKS[network.name];
  const config = readDeploymentConfig();
  const actualChainId = Number((await ethers.provider.getNetwork()).chainId);
  if (actualChainId !== profile.chainId) {
    throw new Error(`RPC chain mismatch: expected ${profile.chainId}, received ${actualChainId}`);
  }
  if (config.confidentialToken.toLowerCase() !== profile.officialCUsdt.toLowerCase()) {
    throw new Error(
      `CONFIDENTIAL_TOKEN_ADDRESS is not Zama's official ${network.name} cUSDT (${profile.officialCUsdt})`,
    );
  }
  const tokenCode = await ethers.provider.getCode(config.confidentialToken);
  if (tokenCode === "0x") throw new Error("Official cUSDT address has no deployed bytecode on the selected RPC");

  const ownerCode = await ethers.provider.getCode(config.owner);
  if (network.name === "mainnet" && ownerCode === "0x") {
    throw new Error("Mainnet OWNER_ADDRESS must be a deployed smart account or multisig");
  }

  const [deployer] = await ethers.getSigners();
  const balance = deployer ? await ethers.provider.getBalance(deployer.address) : 0n;
  console.log(JSON.stringify({
    status: "ready-for-review",
    broadcast: false,
    network: network.name,
    chainId: actualChainId,
    confidentialToken: config.confidentialToken,
    owner: config.owner,
    ownerKind: ownerCode === "0x" ? "eoa" : "contract",
    deployer: deployer?.address ?? null,
    deployerBalanceWei: balance.toString(),
    prizePerDraw: config.prizePerDraw.toString(),
    drawPeriodSeconds: config.drawPeriodSeconds,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
