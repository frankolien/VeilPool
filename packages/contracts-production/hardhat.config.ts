import "@nomicfoundation/hardhat-ethers";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import type { HardhatUserConfig } from "hardhat/config";

// Hardhat 2 does not load .env files itself. Keep local release commands
// reproducible while allowing CI to supply the same values through its
// environment without requiring a secrets file.
if (existsSync(".env")) loadEnvFile(".env");

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
  },
  networks: {
    hardhat: { chainId: 31337 },
    sepolia: {
      chainId: 11155111,
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL ?? "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: { bytecodeHash: "none" },
      optimizer: { enabled: true, runs: 800 },
      evmVersion: "cancun",
    },
  },
};

export default config;
