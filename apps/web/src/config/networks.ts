import type { Address } from "viem";

export type VeilNetwork = {
  readonly chainId: 1 | 11_155_111;
  readonly key: "ethereum" | "sepolia";
  readonly name: string;
  readonly environment: "mainnet" | "testnet";
  readonly explorerUrl: string;
  readonly wrapperRegistry: Address;
  readonly confidentialUsdt: Address;
  readonly underlyingUsdt: Address;
  readonly poolAddress: Address | null;
  readonly faucetAvailable: boolean;
};

/**
 * A network is selectable only when its complete VEIL deployment exists.
 * Official Zama asset addresses come from zama-ai/protocol-apps. The Ethereum
 * pool remains null until deployment; the UI must never present it as live.
 */
export const VEIL_NETWORKS: readonly VeilNetwork[] = [
  {
    chainId: 1,
    key: "ethereum",
    name: "Ethereum",
    environment: "mainnet",
    explorerUrl: "https://etherscan.io",
    wrapperRegistry: "0xeb5015fF021DB115aCe010f23F55C2591059bBA0",
    confidentialUsdt: "0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50",
    underlyingUsdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    poolAddress: null,
    faucetAvailable: false,
  },
  {
    chainId: 11_155_111,
    key: "sepolia",
    name: "Sepolia",
    environment: "testnet",
    explorerUrl: "https://sepolia.etherscan.io",
    wrapperRegistry: "0x2f0750Bbb0A246059d80e94c454586a7F27a128e",
    confidentialUsdt: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    underlyingUsdt: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    poolAddress: "0x46586569269A86A362E8814531543CAfc6972Baf",
    faucetAvailable: true,
  },
] as const;

export const DEFAULT_NETWORK: VeilNetwork = VEIL_NETWORKS[1]!;

export function getVeilNetwork(chainId: number | null | undefined): VeilNetwork | null {
  return VEIL_NETWORKS.find((network) => network.chainId === chainId) ?? null;
}

export function isNetworkReady(network: VeilNetwork): boolean {
  return network.poolAddress !== null;
}
