import { http, createConfig, fallback } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { appConfig } from "@/config/environment";

const PUBLIC_SEPOLIA_TRANSPORTS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://rpc.sepolia.ethpandaops.io",
] as const;

/**
 * The Sepolia transport.
 *
 * A configured RPC is preferred and the public endpoint is the fallback, because
 * public Sepolia RPCs rate-limit aggressively and this app polls draw state.
 * Viem's chain default currently points at a single third-party endpoint, so the
 * release build keeps an explicit, independently operated fallback set instead
 * of allowing one provider outage to degrade every public screen.
 */
const sepoliaTransport = fallback([
  ...(appConfig.rpcUrl ? [http(appConfig.rpcUrl)] : []),
  ...PUBLIC_SEPOLIA_TRANSPORTS.map((url) => http(url)),
]);
const mainnetTransport = appConfig.mainnetRpcUrl
  ? fallback([http(appConfig.mainnetRpcUrl), http()])
  : http();

const connectors = appConfig.walletConnectProjectId
  ? [injected(), walletConnect({ projectId: appConfig.walletConnectProjectId })]
  : [injected()];

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  connectors,
  // Prefer EIP-6963's multi-provider registry over competing writes to the
  // legacy window.ethereum singleton when wallets support it.
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: mainnetTransport,
    [sepolia.id]: sepoliaTransport,
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
