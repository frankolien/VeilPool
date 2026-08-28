"use client";

import type { ReactNode } from "react";
import { Button, Callout, Card, Skeleton, VisuallyHidden } from "@veil/ui";
import { useConnection } from "@/infrastructure/wallet/context";
import { usePoolState, useUserState } from "@/features/pool/queries";
import type { PoolState, UserState } from "@/domain/pool/types";
import { ErrorNotice } from "./ErrorNotice";
import { normalizeError } from "@/domain/errors/normalize";
import styles from "./ConnectGate.module.css";

/**
 * The disconnected, loading and error states every app screen shares.
 *
 * Handled once, so that no screen renders a half-populated dashboard and no
 * screen forgets one of the three. Children receive state that is already
 * loaded, which keeps optional chaining out of the feature code.
 */
export function ConnectGate({
  children,
}: {
  readonly children: (data: { readonly pool: PoolState; readonly user: UserState }) => ReactNode;
}) {
  const { isConnected, isCorrectChain, connect, switchToSepolia } = useConnection();
  const pool = usePoolState();
  const user = useUserState();

  if (!isConnected) {
    return (
      <Card padding="lg" className={styles.gate}>
        <h2 className={styles.title}>Connect to see your private position</h2>
        <p className={styles.body}>
          Your balance, your odds and your winnings are encrypted on-chain. Only a connected
          wallet can decrypt them, and decryption happens in your browser.
        </p>
        <Button size="lg" onClick={connect}>
          Connect wallet
        </Button>
      </Card>
    );
  }

  if (!isCorrectChain) {
    return (
      <Callout
        tone="warning"
        title="Wrong network"
        action={
          <Button size="sm" onClick={switchToSepolia}>
            Switch to Sepolia
          </Button>
        }
      >
        VEIL Pool runs on Sepolia. Your wallet is pointed at a different network.
      </Callout>
    );
  }

  if (pool.error || user.error) {
    return <ErrorNotice error={normalizeError(pool.error ?? user.error)} onRetry={() => void pool.refetch()} />;
  }

  if (!pool.data || !user.data) {
    return (
      <div className={styles.loading}>
        <VisuallyHidden>Loading your position</VisuallyHidden>
        <Skeleton height="10rem" />
        <Skeleton height="14rem" />
      </div>
    );
  }

  return <>{children({ pool: pool.data, user: user.data })}</>;
}
