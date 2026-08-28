"use client";

import { useCallback, useMemo } from "react";
import type { ConfidentialValue } from "@/domain/privacy/confidential";
import type { SealedValueState } from "@veil/ui";
import { useReveal } from "./RevealProvider";

/**
 * Joins a ciphertext handle with anything this session has already decrypted.
 *
 * The gateway returns handles; the reveal store holds plaintexts. Neither knows
 * about the other, and this is the one place they meet — so a component renders
 * a single value with a single state instead of reconciling two sources.
 */
export type ConfidentialAmountView = {
  readonly state: SealedValueState;
  readonly value: bigint | null;
  readonly handlePreview: string | undefined;
  readonly canReveal: boolean;
  readonly reveal: () => Promise<void>;
};

export function useConfidentialAmount(source: ConfidentialValue): ConfidentialAmountView {
  const store = useReveal();

  const handle = source.status === "unavailable" ? null : source.handle;
  const plaintext = handle ? store.plaintextOf(handle) : null;

  const reveal = useCallback(async () => {
    if (handle) await store.reveal([handle]);
  }, [handle, store]);

  return useMemo(() => {
    if (source.status === "unavailable") {
      return {
        state: "unavailable",
        value: null,
        handlePreview: undefined,
        canReveal: false,
        reveal,
      };
    }

    const busy = store.phase !== "idle";
    const state: SealedValueState =
      plaintext !== null ? "revealed" : busy ? "revealing" : "sealed";

    return {
      state,
      value: plaintext,
      handlePreview: shortenHandle(source.handle),
      canReveal: plaintext === null && !busy,
      reveal,
    };
  }, [source, plaintext, store.phase, reveal]);
}

/**
 * Resolves a confidential value that may already be revealed, without touching
 * the network. Used where a figure is needed for a local calculation — savings
 * progress, an odds estimate — and must be absent rather than guessed.
 */
export function useRevealedValue(source: ConfidentialValue): bigint | null {
  const store = useReveal();
  return source.status === "unavailable" ? null : store.plaintextOf(source.handle);
}

function shortenHandle(handle: string): string {
  return `${handle.slice(0, 6)}…${handle.slice(-4)}`;
}
