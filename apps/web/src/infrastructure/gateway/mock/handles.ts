import type { CiphertextHandle } from "@/domain/privacy/confidential";

/**
 * Deterministic stand-in ciphertext handles.
 *
 * A real handle is derived from the ciphertext, so it changes whenever the value
 * behind it changes. The mock reproduces that property — the handle is derived
 * from the value and a slot name — because the UI depends on it: a revealed
 * figure is re-sealed when its handle moves, and a mock that reused handles
 * would hide that bug until Sepolia.
 */
export function mockHandle(slot: string, value: bigint, epoch: number): CiphertextHandle {
  const seed = `${slot}:${value.toString(16)}:${epoch}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const digest = `${hash.toString(16).padStart(8, "0")}${seed.length.toString(16).padStart(4, "0")}`;
  return `0x${digest.repeat(6).slice(0, 64)}` as CiphertextHandle;
}
