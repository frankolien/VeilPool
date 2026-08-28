"use client";

import { ConnectGate } from "@/components/ConnectGate";
import { PrivateVault } from "./PrivateVault";

/** The client boundary for the private vault. See `DrawScreen` for why. */
export function VaultScreen() {
  return <ConnectGate>{({ pool, user }) => <PrivateVault pool={pool} user={user} />}</ConnectGate>;
}
