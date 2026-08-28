"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { WagmiProvider, useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { hasDeployment } from "@veil/contract-abi";
import { wagmiConfig } from "@/infrastructure/chain/wagmi";
import { type Connection, DISCONNECTED } from "./connection";
import { ConnectionContext } from "./context";
import { WalletDialog } from "./WalletDialog";

/**
 * The Sepolia wallet stack.
 *
 * wagmi is confined to this file and `infrastructure/chain`; everything above
 * consumes `Connection`. There is no wallet-kit dependency: the connector list
 * is short, the dialog is twenty lines, and owning it keeps the connect step
 * inside the product's own visual language instead of handing the first
 * impression to a third-party modal.
 */
export function WagmiConnectionProvider({ children }: { readonly children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <ConnectionBridge>{children}</ConnectionBridge>
    </WagmiProvider>
  );
}

function ConnectionBridge({ children }: { readonly children: ReactNode }) {
  const { address, isConnected, isConnecting, chainId } = useAccount();
  const { connectors, connect: connectWith, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain: switchWagmiChain } = useSwitchChain();
  const [dialogOpen, setDialogOpen] = useState(false);

  const connect = useCallback(() => setDialogOpen(true), []);
  const switchChain = useCallback(
    (targetChainId: 1 | 11_155_111) => switchWagmiChain({ chainId: targetChainId }),
    [switchWagmiChain],
  );
  const switchToSepolia = useCallback(() => switchChain(sepolia.id), [switchChain]);

  const value = useMemo<Connection>(() => {
    const busy = isConnecting || isPending;
    const state =
      isConnected && address
        ? {
            address,
            isConnected: true,
            chainId: chainId ?? null,
            isCorrectChain: chainId !== undefined && hasDeployment(chainId),
            isConnecting: busy,
          }
        : { ...DISCONNECTED, isConnecting: busy };

    return { ...state, connect, disconnect, switchToSepolia, switchChain };
  }, [address, isConnected, isConnecting, isPending, chainId, connect, disconnect, switchToSepolia, switchChain]);

  return (
    <ConnectionContext.Provider value={value}>
      {children}
      <WalletDialog
        open={dialogOpen}
        connectors={connectors}
        onSelect={(connector) => {
          connectWith({ connector });
          setDialogOpen(false);
        }}
        onClose={() => setDialogOpen(false)}
      />
    </ConnectionContext.Provider>
  );
}
