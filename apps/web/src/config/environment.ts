/**
 * Runtime configuration.
 *
 * Read once, validated once, and exported as a frozen object. Reaching into
 * `process.env` from a component means a missing variable surfaces as a blank
 * screen in production instead of a clear failure at boot.
 */

export type AppMode =
  /** In-memory gateway. No chain, no wallet, visibly labelled in the UI. */
  | "mock"
  /** Sepolia via the deployed contracts. */
  | "sepolia";

export type AppConfig = {
  readonly mode: AppMode;
  readonly chainId: number;
  readonly rpcUrl: string | null;
  readonly mainnetRpcUrl: string | null;
  readonly walletConnectProjectId: string | null;
  readonly explorerBaseUrl: string;
};

const SEPOLIA_CHAIN_ID = 11_155_111;

function readMode(): AppMode {
  const raw = process.env.NEXT_PUBLIC_VEIL_MODE?.trim().toLowerCase();
  if (raw === "sepolia") return "sepolia";
  if (raw === "mock") return "mock";
  if (raw === undefined || raw === "") return "sepolia";
  throw new Error(
    `NEXT_PUBLIC_VEIL_MODE must be "mock" or "sepolia" (received "${raw}").`,
  );
}

function optional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value === undefined || value === "" ? null : value;
}

const mode = readMode();

export const appConfig: AppConfig = Object.freeze({
  mode,
  chainId: SEPOLIA_CHAIN_ID,
  rpcUrl: optional("NEXT_PUBLIC_SEPOLIA_RPC_URL"),
  mainnetRpcUrl: optional("NEXT_PUBLIC_MAINNET_RPC_URL"),
  walletConnectProjectId: optional("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"),
  explorerBaseUrl: "https://sepolia.etherscan.io",
});

export const isMockMode = appConfig.mode === "mock";

export function transactionUrl(hash: string): string {
  return `${appConfig.explorerBaseUrl}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${appConfig.explorerBaseUrl}/address/${address}`;
}
