"use client";

import { createContext, useContext } from "react";
import type { Connection } from "./connection";

export const ConnectionContext = createContext<Connection | null>(null);

/**
 * The connected wallet.
 *
 * Backed by wagmi on Sepolia and by a stand-in in mock mode. Callers cannot tell
 * which, by design.
 */
export function useConnection(): Connection {
  const value = useContext(ConnectionContext);
  if (!value) {
    throw new Error("useConnection must be used inside a connection provider");
  }
  return value;
}
