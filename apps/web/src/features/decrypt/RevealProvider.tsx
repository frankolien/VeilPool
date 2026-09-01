"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CiphertextHandle } from "@/domain/privacy/confidential";
import type { DecryptionSession } from "@/domain/pool/gateway";
import { normalizeError } from "@/domain/errors/normalize";
import type { ProductError } from "@/domain/errors/taxonomy";
import { useOptionalGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useConnection } from "@/infrastructure/wallet/context";

/**
 * The reveal store.
 *
 * Decrypted values live here and nowhere else: never in `localStorage`, never in
 * a query cache that might be persisted, never in a URL. The store is keyed by
 * ciphertext handle, so a value revealed before a deposit is dropped
 * automatically once the handle moves — a stale figure presented as current is
 * the worst outcome this component can produce.
 *
 * It is cleared on disconnect, on account change, and on demand.
 */

export type RevealPhase = "idle" | "authorizing" | "revealing";

export type RevealStore = {
  readonly phase: RevealPhase;
  readonly error: ProductError | null;
  readonly session: DecryptionSession | null;
  readonly hasSession: boolean;
  /** Plaintext for a handle if it has been revealed this session. */
  readonly plaintextOf: (handle: CiphertextHandle) => bigint | null;
  /** Reveals handles, prompting for a signature only when there is no session. */
  readonly reveal: (handles: readonly CiphertextHandle[]) => Promise<void>;
  /** Drops every revealed value and the session. */
  readonly clear: () => void;
  readonly dismissError: () => void;
};

const RevealContext = createContext<RevealStore | null>(null);

export function RevealProvider({ children }: { readonly children: ReactNode }) {
  const gateway = useOptionalGateway();
  const { address } = useConnection();

  const [phase, setPhase] = useState<RevealPhase>("idle");
  const [error, setError] = useState<ProductError | null>(null);
  const [session, setSession] = useState<DecryptionSession | null>(null);
  const [revealed, setRevealed] = useState<ReadonlyMap<CiphertextHandle, bigint>>(new Map());

  // Held in a ref as well so `reveal` can read the current session without
  // re-creating itself on every reveal, which would restart in-flight callers.
  const sessionRef = useRef<DecryptionSession | null>(null);

  const clear = useCallback(() => {
    sessionRef.current = null;
    setRevealed(new Map());
    setSession(null);
    setError(null);
    setPhase("idle");
  }, []);

  // Disconnecting or switching accounts must not leave the previous account's
  // figures on screen.
  useEffect(() => {
    // Security boundary: account changes must synchronously discard plaintexts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    clear();
  }, [address, clear]);

  const reveal = useCallback(
    async (handles: readonly CiphertextHandle[]) => {
      if (!gateway || handles.length === 0) return;
      setError(null);

      try {
        let active = sessionRef.current;
        const expired = active !== null && active.expiresAt <= Math.floor(Date.now() / 1000);

        if (!active || expired) {
          setPhase("authorizing");
          active = await gateway.authorizeDecryption();
          sessionRef.current = active;
          setSession(active);
        }

        setPhase("revealing");
        const result = await gateway.decrypt(handles, active);

        setRevealed((previous) => {
          const next = new Map(previous);
          for (const [handle, value] of result) next.set(handle, value);
          return next;
        });
      } catch (cause) {
        const productError = normalizeError(cause, "signature");
        setError(productError);
        if (productError.code === "decryption-expired") {
          sessionRef.current = null;
          setSession(null);
        }
      } finally {
        setPhase("idle");
      }
    },
    [gateway],
  );

  const value = useMemo<RevealStore>(
    () => ({
      phase,
      error,
      session,
      hasSession: session !== null,
      plaintextOf: (handle) => revealed.get(handle) ?? null,
      reveal,
      clear,
      dismissError: () => setError(null),
    }),
    [phase, error, session, revealed, reveal, clear],
  );

  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useReveal(): RevealStore {
  const value = useContext(RevealContext);
  if (!value) throw new Error("useReveal must be used inside RevealProvider");
  return value;
}
