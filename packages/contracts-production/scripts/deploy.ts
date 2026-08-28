import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ethers, network } from "hardhat";
import { readDeploymentConfig } from "./config";

async function main() {
  if (network.name !== "sepolia" && network.name !== "mainnet") {
    throw new Error("Production deployment requires --network sepolia or --network mainnet");
  }
  if (network.name === "mainnet" && process.env.CONFIRM_MAINNET_DEPLOY !== "DEPLOY_VEIL_TO_ETHEREUM") {
    throw new Error(
      "Mainnet broadcast blocked. Set CONFIRM_MAINNET_DEPLOY=DEPLOY_VEIL_TO_ETHEREUM only after review and funding.",
    );
  }
  const config = readDeploymentConfig();
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured");

  const balance = await ethers.provider.getBalance(deployer.address);
  if (balance === 0n) throw new Error(`Deployer ${deployer.address} has no ${network.name} ETH`);

  const providerChainId = Number((await ethers.provider.getNetwork()).chainId);
  const expectedChainId = network.name === "mainnet" ? 1 : 11_155_111;
  if (providerChainId !== expectedChainId) {
    throw new Error(`RPC chain mismatch: expected ${expectedChainId}, received ${providerChainId}`);
  }

  const tokenCode = await ethers.provider.getCode(config.confidentialToken);
  if (tokenCode === "0x") throw new Error("CONFIDENTIAL_TOKEN_ADDRESS has no deployed bytecode");

  const factory = await ethers.getContractFactory("ConfidentialPrizePool", deployer);
  const pool = await factory.deploy(
    config.confidentialToken,
    config.prizePerDraw,
    config.drawPeriodSeconds,
    config.owner,
  );
  const deploymentTransaction = pool.deploymentTransaction();
  if (!deploymentTransaction) throw new Error("Missing deployment transaction");
  const receipt = await deploymentTransaction.wait();
  if (!receipt) throw new Error("Missing deployment receipt");

  const manifest = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    owner: config.owner,
    pool: await pool.getAddress(),
    confidentialToken: config.confidentialToken,
    prizePerDraw: config.prizePerDraw.toString(),
    drawPeriodSeconds: config.drawPeriodSeconds,
    deploymentTransaction: deploymentTransaction.hash,
    blockCreated: receipt.blockNumber,
  } as const;

  const directory = resolve("deployments");
  await mkdir(directory, { recursive: true });
  const output = resolve(directory, `${network.name}.json`);
  await writeFile(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
