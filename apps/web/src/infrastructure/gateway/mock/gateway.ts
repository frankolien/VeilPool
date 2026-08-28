import type { Address, Hash } from "viem";
import type {
  DecryptionResult,
  DecryptionSession,
  PoolGateway,
  TransactionResult,
  WriteOptions,
} from "@/domain/pool/gateway";
import type { PoolState, UserState } from "@/domain/pool/types";
import { sealed } from "@/domain/privacy/confidential";
import type { CiphertextHandle } from "@/domain/privacy/confidential";
import { productError } from "@/domain/errors/taxonomy";
import { DECRYPTION_SESSION_SECONDS } from "@/config/product";
import { MOCK_PARTICIPANT_CAP, MockPoolStore } from "./store";
import { persistStore } from "./persistence";
import { mockHandle } from "./handles";

/**
 * An in-memory `PoolGateway`.
 *
 * Every screen in the app is built and demonstrated against this before a
 * deployment exists, and it stays useful afterwards: it is the only way to
 * exercise the pool-full, reserve-empty and zero-weight states on demand.
 *
 * It is wired only when `NEXT_PUBLIC_VEIL_MODE=mock`, and the UI carries a
 * standing demo-data banner in that mode. It must never back a build that
 * presents itself as live.
 */

/** Simulated latencies, chosen so flows feel like Sepolia rather than instant. */
const LATENCY = {
  encrypt: 900,
  wallet: 600,
  confirm: 1_800,
  refresh: 350,
  decrypt: 700,
  signature: 900,
} as const;

/** Participants credited per simulated scan transaction. See ADR-002. */
const SCAN_BATCH_SIZE = 20;

const POOL_ADDRESS = "0x5EE1000000000000000000000000000000000001" as Address;
const USDT_ADDRESS = "0x5EE1000000000000000000000000000000000002" as Address;
const CUSDT_ADDRESS = "0x5EE1000000000000000000000000000000000003" as Address;

export type MockGatewayOptions = {
  readonly account: Address;
  /** Overridable so tests can run without waiting. */
  readonly latencyScale?: number;
};

export class MockPoolGateway implements PoolGateway {
  private readonly store: MockPoolStore;
  private readonly account: Address;
  private readonly latencyScale: number;
  private session: DecryptionSession | null = null;
  /** Plaintexts the mock "decrypts" back, keyed by the handle it issued. */
  private readonly plaintexts = new Map<CiphertextHandle, bigint>();

  constructor(options: MockGatewayOptions, store = new MockPoolStore()) {
    this.store = store;
    this.account = options.account;
    this.latencyScale = options.latencyScale ?? 1;
  }

  // ---- Reads ------------------------------------------------------------

  async getPoolState(): Promise<PoolState> {
    const now = this.now();
    this.store.tick(now);

    return {
      address: POOL_ADDRESS,
      asset: {
        underlying: {
          address: USDT_ADDRESS,
          symbol: "USDT",
          name: "Mock Tether USD",
          decimals: 6,
        },
        confidential: {
          address: CUSDT_ADDRESS,
          symbol: "cUSDT",
          name: "Confidential Tether USD",
          decimals: 6,
        },
      },
      draw: {
        id: this.store.drawId,
        status: this.store.drawStatus,
        opensAt: this.store.drawOpensAt,
        closesAt: this.store.drawClosesAt,
        prize: this.store.prize,
        participantCount: this.store.participantCount,
        ...(this.store.drawStatus === "sealing"
          ? {
              progress: {
                processed: this.store.scanCursor,
                total: this.store.scanTotal,
              },
            }
          : {}),
        ...(this.store.sealTransaction ? { sealTransaction: this.store.sealTransaction } : {}),
      },
      prizeReserve: this.store.prizeReserve,
      prizeReserveVisibility: "public",
      isDemoReserve: true,
      participantCount: this.store.participantCount,
      participantCap: MOCK_PARTICIPANT_CAP,
    };
  }

  async getUserState(account: Address): Promise<UserState> {
    const now = this.now();
    this.store.tick(now);

    const wallet = this.store.account(account);
    const participant = this.store.participant(account);

    return {
      address: account,
      underlyingBalance: wallet.underlyingBalance,
      wrapperAllowance: wallet.wrapperAllowance,
      confidentialBalance: this.seal("cusdt", account, wallet.confidentialBalance, wallet.epoch),
      principal: participant
        ? this.seal("principal", account, participant.principal, participant.epoch)
        : { status: "unavailable" },
      unclaimedWinnings: participant
        ? this.seal("winnings", account, participant.unclaimedWinnings, participant.epoch)
        : { status: "unavailable" },
      isParticipant: participant !== null,
      eligibleFromDrawId: participant?.eligibleFromDrawId ?? this.store.drawId + 1,
      hasPoolOperatorApproval: wallet.poolOperatorUntil > now,
    };
  }

  // ---- Public token boundary --------------------------------------------

  async mintFromFaucet(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const wallet = this.store.account(this.account);
      wallet.underlyingBalance += amount;
      wallet.epoch += 1;
    });
  }

  async approveWrapper(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const wallet = this.store.account(this.account);
      wallet.wrapperAllowance = amount;
      wallet.epoch += 1;
    });
  }

  async shield(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const wallet = this.store.account(this.account);
      if (wallet.underlyingBalance < amount) throw productError("insufficient-underlying");
      if (wallet.wrapperAllowance < amount) throw productError("missing-erc20-approval");
      wallet.underlyingBalance -= amount;
      wallet.wrapperAllowance -= amount;
      wallet.confidentialBalance += amount;
      wallet.epoch += 1;
    });
  }

  async unshield(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const wallet = this.store.account(this.account);
      // Confidential transfers clamp rather than revert — they cannot reveal the
      // balance by failing. The UI has to handle "moved nothing", so the mock
      // reproduces it instead of throwing.
      const moved = min(amount, wallet.confidentialBalance);
      wallet.confidentialBalance -= moved;
      wallet.underlyingBalance += moved;
      wallet.epoch += 1;
    });
  }

  // ---- Confidential pool -------------------------------------------------

  async setPoolOperator(until: Date, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const wallet = this.store.account(this.account);
      wallet.poolOperatorUntil = Math.floor(until.getTime() / 1000);
      wallet.epoch += 1;
    });
  }

  async deposit(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(
      options,
      ["encrypting", "awaiting-wallet", "confirming", "refreshing"],
      () => {
        const now = this.now();
        this.store.tick(now);

        const wallet = this.store.account(this.account);
        if (wallet.poolOperatorUntil <= now) throw productError("missing-operator-approval");
        if (this.store.drawStatus === "sealing") throw productError("draw-in-progress");

        const existing = this.store.participant(this.account);
        if (!existing && this.store.participantCount >= MOCK_PARTICIPANT_CAP) {
          throw productError("participant-limit-reached");
        }

        const moved = min(amount, wallet.confidentialBalance);
        wallet.confidentialBalance -= moved;
        wallet.epoch += 1;

        if (existing) {
          existing.principal += moved;
          existing.epoch += 1;
          return;
        }

        this.store.participants.set(this.account, {
          principal: moved,
          unclaimedWinnings: 0n,
          // A deposit lands after the current draw's set is fixed.
          eligibleFromDrawId: this.store.drawId + 1,
          epoch: 0,
        });
      },
    );
  }

  async fundPrizeReserve(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(
      options,
      ["encrypting", "awaiting-wallet", "confirming", "refreshing"],
      () => {
        const wallet = this.store.account(this.account);
        if (wallet.poolOperatorUntil <= this.now()) throw productError("missing-operator-approval");
        const moved = min(amount, wallet.confidentialBalance);
        wallet.confidentialBalance -= moved;
        wallet.epoch += 1;
        this.store.prizeReserve += moved;
      },
    );
  }

  async withdraw(amount: bigint, options?: WriteOptions): Promise<TransactionResult> {
    return this.write(
      options,
      ["encrypting", "awaiting-wallet", "confirming", "refreshing"],
      () => {
        this.store.tick(this.now());
        if (this.store.drawStatus === "sealing") throw productError("draw-in-progress");

        const participant = this.store.participant(this.account);
        if (!participant) throw productError("zero-ciphertext-handle");

        const moved = min(amount, participant.principal);
        participant.principal -= moved;
        participant.epoch += 1;

        const wallet = this.store.account(this.account);
        wallet.confidentialBalance += moved;
        wallet.epoch += 1;
      },
    );
  }

  async sealDraw(options?: WriteOptions): Promise<TransactionResult> {
    const now = this.now();
    this.store.tick(now);
    if (this.store.drawStatus === "open") throw productError("draw-not-ready");
    if (this.store.prizeReserve < this.store.prize) {
      throw productError("prize-reserve-insufficient");
    }

    options?.report?.("awaiting-wallet");
    await this.delay(LATENCY.wallet);
    options?.report?.("confirming");

    // The scan may not fit in one transaction. Each pass is a transaction, and
    // progress is reported so the draw room can show a determinate scan.
    let complete = false;
    let hash = randomHash();
    while (!complete) {
      await this.delay(LATENCY.confirm);
      complete = this.store.advanceScan(SCAN_BATCH_SIZE, this.now());
      hash = randomHash();
      this.store.sealTransaction = hash;
      persistStore(this.store);
    }

    options?.report?.("refreshing");
    await this.delay(LATENCY.refresh);
    return { hash, blockNumber: 0n };
  }

  async claimWinnings(options?: WriteOptions): Promise<TransactionResult> {
    return this.write(options, ["awaiting-wallet", "confirming", "refreshing"], () => {
      const participant = this.store.participant(this.account);
      if (!participant) throw productError("zero-ciphertext-handle");

      const claimed = participant.unclaimedWinnings;
      participant.unclaimedWinnings = 0n;
      participant.epoch += 1;

      const wallet = this.store.account(this.account);
      wallet.confidentialBalance += claimed;
      wallet.epoch += 1;
    });
  }

  // ---- Decryption --------------------------------------------------------

  async authorizeDecryption(): Promise<DecryptionSession> {
    const now = this.now();
    if (this.session && this.session.expiresAt > now) return this.session;

    await this.delay(LATENCY.signature);
    this.session = {
      contracts: [POOL_ADDRESS, CUSDT_ADDRESS],
      expiresAt: now + DECRYPTION_SESSION_SECONDS,
    };
    return this.session;
  }

  async decrypt(
    handles: readonly CiphertextHandle[],
    session: DecryptionSession,
  ): Promise<DecryptionResult> {
    if (session.expiresAt <= this.now()) throw productError("decryption-expired");
    await this.delay(LATENCY.decrypt);

    const revealed = new Map<CiphertextHandle, bigint>();
    for (const handle of handles) {
      const value = this.plaintexts.get(handle);
      if (value === undefined) throw productError("missing-acl-permission");
      revealed.set(handle, value);
    }
    return revealed;
  }

  /** Lets the demo advance past a settled draw without waiting for a keeper. */
  openNextDraw(): void {
    this.store.openNextDraw(this.now());
    persistStore(this.store);
  }

  // ---- Internals ---------------------------------------------------------

  private seal(slot: string, account: Address, value: bigint, epoch: number) {
    const handle = mockHandle(`${slot}:${account}`, value, epoch);
    this.plaintexts.set(handle, value);
    return sealed(handle);
  }

  /**
   * Runs a simulated write, reporting each stage and applying `mutate` at the
   * point the chain would have applied it — after the wallet, before the refresh.
   */
  private async write(
    options: WriteOptions | undefined,
    stages: readonly ("encrypting" | "awaiting-wallet" | "confirming" | "refreshing")[],
    mutate: () => void,
  ): Promise<TransactionResult> {
    for (const stage of stages) {
      options?.signal?.throwIfAborted();
      options?.report?.(stage);
      await this.delay(LATENCY[stageLatency(stage)]);
      if (stage === "confirming") {
        mutate();
        persistStore(this.store);
      }
    }
    return { hash: randomHash(), blockNumber: 0n };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms * this.latencyScale));
  }

  private now(): number {
    return Math.floor(Date.now() / 1000);
  }
}

function stageLatency(
  stage: "encrypting" | "awaiting-wallet" | "confirming" | "refreshing",
): keyof typeof LATENCY {
  switch (stage) {
    case "encrypting":
      return "encrypt";
    case "awaiting-wallet":
      return "wallet";
    case "confirming":
      return "confirm";
    case "refreshing":
      return "refresh";
  }
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function randomHash(): Hash {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")}` as Hash;
}
