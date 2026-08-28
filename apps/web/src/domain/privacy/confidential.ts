/**
 * The confidential-value model.
 *
 * A ciphertext handle is public: anyone can read it from the chain. The plaintext
 * behind it is not, and reaching it costs the user an EIP-712 signature. That
 * asymmetry is the product, so it is modelled explicitly rather than collapsed
 * into `bigint | undefined`.
 *
 * Reveal *progress* is deliberately not part of this union — see
 * `domain/transactions/decryption`. This type describes what is known, not what
 * is happening.
 */

export type CiphertextHandle = `0x${string}`;

/**
 * FHEVM returns the zero handle for storage that was never written. It is not
 * an error and it is not a balance of zero that the user can decrypt — there is
 * simply no ciphertext. Treating it as "0" would invent a value.
 */
export const ZERO_HANDLE: CiphertextHandle =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export function isZeroHandle(handle: CiphertextHandle): boolean {
  return handle === ZERO_HANDLE;
}

export type ConfidentialValue =
  /** No ciphertext exists yet. The user has never held this position. */
  | { readonly status: "unavailable" }
  /** A ciphertext exists and has not been decrypted in this session. */
  | { readonly status: "sealed"; readonly handle: CiphertextHandle }
  /** Decrypted locally. `value` never leaves the browser. */
  | {
      readonly status: "revealed";
      readonly handle: CiphertextHandle;
      readonly value: bigint;
      readonly revealedAt: number;
    };

export function sealed(handle: CiphertextHandle): ConfidentialValue {
  return isZeroHandle(handle) ? { status: "unavailable" } : { status: "sealed", handle };
}

export function revealed(
  handle: CiphertextHandle,
  value: bigint,
  revealedAt: number,
): ConfidentialValue {
  return { status: "revealed", handle, value, revealedAt };
}

/** The plaintext if it is known locally, otherwise `null`. Never throws. */
export function plaintextOf(value: ConfidentialValue): bigint | null {
  return value.status === "revealed" ? value.value : null;
}

/** True when a decryption would actually produce something. */
export function isRevealable(value: ConfidentialValue): boolean {
  return value.status === "sealed";
}

/**
 * Re-seals a value whose handle has moved on.
 *
 * Called after any transaction that mutates the position. A revealed figure
 * bound to a stale handle is worse than no figure: it looks authoritative and
 * is wrong.
 */
export function reconcile(
  previous: ConfidentialValue,
  nextHandle: CiphertextHandle,
): ConfidentialValue {
  if (isZeroHandle(nextHandle)) return { status: "unavailable" };
  if (previous.status === "revealed" && previous.handle === nextHandle) return previous;
  return { status: "sealed", handle: nextHandle };
}
