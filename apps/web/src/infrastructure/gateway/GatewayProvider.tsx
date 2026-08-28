"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PoolGateway } from "@/domain/pool/gateway";
import { isMockMode } from "@/config/environment";
import { useConnection } from "@/infrastructure/wallet/context";
import { MockPoolGateway } from "./mock/gateway";
import type { MockPoolStore } from "./mock/store";
import { restoreStore } from "./mock/persistence";
import { ContractPoolGateway } from "./contract/gateway";
import { hasDeployment } from "@veil/contract-abi";

/**
 * Supplies the `PoolGateway` the whole app reads and writes through.
 *
 * The mock store is restored once per page load and shared across gateways, so
 * that neither a reconnect nor a reload silently resets the user's simulated
 * position. Chain state persists; the simulation of it has to as well.
 */
const GatewayContext = createContext<PoolGateway | null>(null);

let sharedMockStore: MockPoolStore | null = null;

function mockStore(): MockPoolStore {
  sharedMockStore ??= restoreStore();
  return sharedMockStore;
}

export function GatewayProvider({ children }: { readonly children: ReactNode }) {
  const { address, chainId } = useConnection();

  const gateway = useMemo<PoolGateway | null>(() => {
    if (!address) return null;
    if (isMockMode) return new MockPoolGateway({ account: address }, mockStore());
    if (!chainId || !hasDeployment(chainId)) return null;
    return new ContractPoolGateway(address, chainId);
  }, [address, chainId]);

  return <GatewayContext.Provider value={gateway}>{children}</GatewayContext.Provider>;
}

/** The gateway, or `null` while no account is connected. */
export function useOptionalGateway(): PoolGateway | null {
  return useContext(GatewayContext);
}

/** The gateway, for code that has already established a connection. */
export function useGateway(): PoolGateway {
  const gateway = useOptionalGateway();
  if (!gateway) throw new Error("useGateway requires a connected account");
  return gateway;
}
