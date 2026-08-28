import type { Address } from "viem";
import type { Draw } from "@/domain/draw/types";
import { MockPoolStore, type MockAccount, type MockParticipant } from "./store";

/**
 * Persistence for the simulated chain.
 *
 * `MockPoolStore` stands in for chain state, and chain state survives a page
 * reload — so the simulation has to as well. Without this, a reviewer who
 * refreshes, or who opens a deep link to the draw room, loses the position they
 * just deposited, and the walkthrough resets with it.
 *
 * This does not conflict with the sensitive-data policy. What is stored here is
 * fabricated demo state belonging to a simulated protocol, not a decrypted
 * balance, a signature, or a decryption key — and the module is only ever loaded
 * in mock mode. Real balances stay in memory, on both sides of the boundary.
 *
 * `sessionStorage` rather than `localStorage`: a demo should not outlive the tab.
 */

const STORAGE_KEY = "veil.mock.chain";
const SCHEMA_VERSION = 1;

type SerializedStore = {
  readonly version: number;
  readonly accounts: readonly (readonly [Address, SerializedAccount])[];
  readonly participants: readonly (readonly [Address, SerializedParticipant])[];
  readonly prizeReserve: string;
  readonly drawId: number;
  readonly drawStatus: Draw["status"];
  readonly drawOpensAt: number;
  readonly drawClosesAt: number;
};

type SerializedAccount = Omit<MockAccount, "underlyingBalance" | "confidentialBalance" | "wrapperAllowance"> & {
  readonly underlyingBalance: string;
  readonly confidentialBalance: string;
  readonly wrapperAllowance: string;
};

type SerializedParticipant = Omit<MockParticipant, "principal" | "unclaimedWinnings"> & {
  readonly principal: string;
  readonly unclaimedWinnings: string;
};

export function persistStore(store: MockPoolStore): void {
  const snapshot: SerializedStore = {
    version: SCHEMA_VERSION,
    accounts: [...store.accounts].map(([address, account]) => [
      address,
      {
        ...account,
        underlyingBalance: account.underlyingBalance.toString(),
        confidentialBalance: account.confidentialBalance.toString(),
        wrapperAllowance: account.wrapperAllowance.toString(),
      },
    ]),
    participants: [...store.participants].map(([address, participant]) => [
      address,
      {
        ...participant,
        principal: participant.principal.toString(),
        unclaimedWinnings: participant.unclaimedWinnings.toString(),
      },
    ]),
    prizeReserve: store.prizeReserve.toString(),
    drawId: store.drawId,
    drawStatus: store.drawStatus,
    drawOpensAt: store.drawOpensAt,
    drawClosesAt: store.drawClosesAt,
  };

  write(STORAGE_KEY, JSON.stringify(snapshot));
}

/**
 * Rebuilds a store from storage, or returns a fresh one.
 *
 * A snapshot taken mid-scan is discarded rather than resumed: the scan cursor and
 * the pending winner are transient, and a half-restored draw would be a state the
 * protocol cannot actually be in.
 */
export function restoreStore(): MockPoolStore {
  const raw = read(STORAGE_KEY);
  if (!raw) return new MockPoolStore();

  try {
    const snapshot = JSON.parse(raw) as SerializedStore;
    if (snapshot.version !== SCHEMA_VERSION) return new MockPoolStore();

    const store = new MockPoolStore();
    store.accounts.clear();
    store.participants.clear();

    for (const [address, account] of snapshot.accounts) {
      store.accounts.set(address, {
        ...account,
        underlyingBalance: BigInt(account.underlyingBalance),
        confidentialBalance: BigInt(account.confidentialBalance),
        wrapperAllowance: BigInt(account.wrapperAllowance),
      });
    }

    for (const [address, participant] of snapshot.participants) {
      store.participants.set(address, {
        ...participant,
        principal: BigInt(participant.principal),
        unclaimedWinnings: BigInt(participant.unclaimedWinnings),
      });
    }

    store.prizeReserve = BigInt(snapshot.prizeReserve);
    store.drawId = snapshot.drawId;
    store.drawStatus = snapshot.drawStatus === "sealing" ? "ready" : snapshot.drawStatus;
    store.drawOpensAt = snapshot.drawOpensAt;
    store.drawClosesAt = snapshot.drawClosesAt;

    return store;
  } catch {
    // A corrupt or stale snapshot is not worth surfacing to the user; starting
    // clean is the same outcome they would have had before this existed.
    return new MockPoolStore();
  }
}

export function clearStore(): void {
  write(STORAGE_KEY, null);
}

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, value);
  } catch {
    // Storage is unavailable in private modes. The simulation still runs; it
    // just will not survive a reload.
  }
}
