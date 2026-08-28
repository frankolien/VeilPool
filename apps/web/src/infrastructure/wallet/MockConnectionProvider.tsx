"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { appConfig } from "@/config/environment";
import { type Connection, DISCONNECTED, MOCK_ACCOUNT } from "./connection";
import { ConnectionContext } from "./context";

/**
 * A wallet stand-in for mock mode.
 *
 * Connecting is instant and installs a fixed demo account. A reviewer can walk
 * the entire product before touching a wallet, and every screen still passes
 * through the same connected and disconnected states it will face on Sepolia —
 * which is the only reason a fake wallet is worth having.
 *
 * The connected flag survives a reload, because wagmi's does: a reviewer who
 * refreshes, or who opens a deep link to the draw room, should land where they
 * expect rather than being bounced back to a connect screen. Only the boolean is
 * stored — no address, no balance, nothing derived from a position — and
 * `sessionStorage` scopes it to the tab so it does not outlive the demo.
 */
const SESSION_KEY = "veil.mock.connected";

export function MockConnectionProvider({ children }: { readonly children: ReactNode }) {
  const [connected, setConnected] = useState(false);

  // Read after mount rather than in a lazy initialiser: the server render has no
  // storage, and disagreeing with it would be a hydration mismatch.
  useEffect(() => {
    setConnected(readStoredFlag());
  }, []);

  const connect = useCallback(() => {
    writeStoredFlag(true);
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    writeStoredFlag(false);
    setConnected(false);
  }, []);

  const switchToSepolia = useCallback(() => undefined, []);
  const switchChain = useCallback(() => undefined, []);

  const value = useMemo<Connection>(
    () => ({
      ...(connected
        ? {
            address: MOCK_ACCOUNT,
            isConnected: true,
            chainId: appConfig.chainId,
            isCorrectChain: true,
            isConnecting: false,
          }
        : DISCONNECTED),
      connect,
      disconnect,
      switchToSepolia,
      switchChain,
    }),
    [connected, connect, disconnect, switchToSepolia, switchChain],
  );

  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

// Storage throws in private-browsing modes and when site data is blocked. A demo
// wallet is not worth crashing the page over.
function readStoredFlag(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredFlag(next: boolean): void {
  try {
    if (next) window.sessionStorage.setItem(SESSION_KEY, "true");
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Connection still works for this page view; it just will not survive a reload.
  }
}
