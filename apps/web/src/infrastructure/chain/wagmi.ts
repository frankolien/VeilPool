import { http, createConfig, fallback } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { appConfig } from "@/config/environment";

/**
 * The Sepolia transport.
 *
 * A configured RPC is preferred and the public endpoint is the fallback, because
 * public Sepolia RPCs rate-limit aggressively and this app polls draw state. The
 * rate-limit case is handled in the error taxonomy rather than hidden here.
 */
const sepoliaTransport = appConfig.rpcUrl
  ? fallback([http(appConfig.rpcUrl), http()])
  : http();
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
