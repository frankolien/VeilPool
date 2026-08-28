"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card } from "@veil/ui";
import type { UserState } from "@/domain/pool/types";
import type { CiphertextHandle } from "@/domain/privacy/confidential";
import { ErrorNotice } from "@/components/ErrorNotice";
import { useReveal } from "./RevealProvider";
import styles from "./RevealBar.module.css";

/**
 * The decryption session control.
 *
 * One signature covers every figure the user owns, so this bar exists to make
 * that trade explicit: sign once, reveal everything, and clear it when you are
 * done. Revealing value-by-value would mean a wallet prompt per number, which
 * trains people to approve signatures without reading them.
 *
 * "Hide values" is as prominent as "Reveal" on purpose. Anyone demonstrating
 * this product on a shared screen needs a one-click way to put the numbers away.
 */
export function RevealBar({ user }: { readonly user: UserState }) {
  const store = useReveal();
  const [remaining, setRemaining] = useState<number | null>(null);

  const handles = useMemo(() => collectHandles(user), [user]);
  const revealedCount = handles.filter((handle) => store.plaintextOf(handle) !== null).length;

  useEffect(() => {
    if (!store.session) {
      setRemaining(null);
      return;
    }
    const update = () =>
      setRemaining(Math.max(0, store.session!.expiresAt - Math.floor(Date.now() / 1000)));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [store.session]);

  const busy = store.phase !== "idle";
  const allRevealed = handles.length > 0 && revealedCount === handles.length;

  return (
    <>
      <Card padding="md" className={styles.bar}>
        <div className={styles.text}>
          <p className={styles.title}>
            {allRevealed ? "Your values are visible on this screen" : "Your values are encrypted"}
          </p>
          <p className={styles.detail}>
            {allRevealed
              ? "They were decrypted in this browser. Nothing was sent anywhere, and nothing is stored."
              : "One signature authorises decryption of every figure you own. It cannot move funds."}
          </p>
        </div>

        <div className={styles.controls}>
          {remaining !== null && remaining > 0 ? (
            <Badge tone="accent" glyph="◆">
              {`Session ${formatRemaining(remaining)}`}
            </Badge>
          ) : null}

          {allRevealed ? (
            <Button variant="secondary" onClick={store.clear}>
              Hide values
            </Button>
          ) : (
            <Button
              onClick={() => void store.reveal(handles)}
              loading={busy}
              disabled={busy || handles.length === 0}
            >
              {store.phase === "authorizing"
                ? "Check your wallet"
                : store.phase === "revealing"
                  ? "Decrypting"
                  : store.hasSession
                    ? "Reveal values"
                    : "Sign to reveal"}
            </Button>
          )}
        </div>
      </Card>

      {store.error ? (
        <ErrorNotice
          error={store.error}
          onRetry={() => void store.reveal(handles)}
          onDismiss={store.dismissError}
        />
      ) : null}
    </>
  );
}

/** Every handle this user is entitled to decrypt, deduplicated. */
function collectHandles(user: UserState): readonly CiphertextHandle[] {
  const sources = [user.principal, user.unclaimedWinnings, user.confidentialBalance];
  const handles = new Set<CiphertextHandle>();
  for (const source of sources) {
    if (source.status !== "unavailable") handles.add(source.handle);
  }
  return [...handles];
}

function formatRemaining(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);
  return minutes > 1 ? `${minutes} min left` : "under a minute left";
}
