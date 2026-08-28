import type { Address, Hash } from "viem";
import type { CiphertextHandle } from "../privacy/confidential";
import type { PoolState, UserState } from "./types";

/**
 * The boundary between the product and the chain.
 *
 * Everything above this interface — features, screens, state machines — is
 * written against `PoolGateway` and never imports wagmi, viem or the FHE SDK.
 * Two implementations exist: `MockPoolGateway` for product work with no chain,
 * and `ContractPoolGateway` for Sepolia. Screens cannot tell them apart, which
 * is the point: it keeps chain mechanics out of the UI and makes every flow
 * demonstrable before a deployment exists.
 */

/** Stages a write goes through. Reported so the UI can narrate, not spin. */
export type WriteStage =
  /** Building the encrypted input and its zero-knowledge proof. */
  | "encrypting"
  /** Waiting for the user to confirm in their wallet. */
  | "awaiting-wallet"
  /** Broadcast; waiting for inclusion. */
  | "confirming"
  /** Included; re-reading chain state so the UI matches reality. */
  | "refreshing";

export type WriteOptions = {
  readonly report?: (stage: WriteStage) => void;
  readonly signal?: AbortSignal;
};

export type TransactionResult = {
  readonly hash: Hash;
  readonly blockNumber: bigint;
};

/**
 * An authorised decryption session.
 *
 * Created by one EIP-712 signature covering a set of contracts for a bounded
 * window. Held in memory only: it is not written to storage, because it
 * authorises reading the user's financial position.
 */
export type DecryptionSession = {
  readonly contracts: readonly Address[];
  readonly expiresAt: number;
};

export type DecryptionResult = ReadonlyMap<CiphertextHandle, bigint>;

export interface PoolGateway {
  // ---- Reads ------------------------------------------------------------
  // Both return only what the caller is entitled to see: public pool facts,
  // and ciphertext handles for anything encrypted.

  getPoolState(): Promise<PoolState>;
  getUserState(account: Address): Promise<UserState>;

  // ---- Public token boundary --------------------------------------------

  /** Mint mock USDT. Sepolia only; public amount. */
  mintFromFaucet(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /** ERC-20 approval for the confidential wrapper. Public amount. */
  approveWrapper(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /** Public USDT into confidential cUSDT. The amount is public — see ADR-001. */
  shield(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /** Confidential cUSDT back into public USDT. The amount becomes public. */
  unshield(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  // ---- Confidential pool -------------------------------------------------

  /**
   * Authorise the pool to move this account's cUSDT.
   *
   * ERC-7984 operator approval is unbounded in amount but bounded in time, so
   * `until` is surfaced rather than hidden behind a "max approve" default.
   */
  setPoolOperator(until: Date, options?: WriteOptions): Promise<TransactionResult>;

  deposit(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /** Adds encrypted cUSDT to the prize-only ledger. Never becomes principal. */
  fundPrizeReserve(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /** Withdraws principal. Never touches prize liquidity. */
  withdraw(amount: bigint, options?: WriteOptions): Promise<TransactionResult>;

  /**
   * Advances a ready draw.
   *
   * Permissionless. Resolves once the draw reaches `awarded`; if the protocol
   * needs several transactions to finish the encrypted scan, the implementation
   * sends them and reports progress through `options.report`.
   */
  sealDraw(options?: WriteOptions): Promise<TransactionResult>;

  /** Moves encrypted winnings from the pool back to the user's cUSDT balance. */
  claimWinnings(options?: WriteOptions): Promise<TransactionResult>;

  // ---- Decryption --------------------------------------------------------

  /**
   * Obtains a decryption session, prompting for an EIP-712 signature if the
   * current one is missing or expired.
   *
   * Separated from `decrypt` so the UI can ask for the signature once and then
   * reveal several values without further prompts.
   */
  authorizeDecryption(): Promise<DecryptionSession>;

  /**
   * Decrypts handles locally.
   *
   * Batched by design: revealing principal, winnings and balance costs one
   * round trip instead of three. Plaintexts are returned to the caller and go
   * nowhere else.
   */
  decrypt(
    handles: readonly CiphertextHandle[],
    session: DecryptionSession,
  ): Promise<DecryptionResult>;
}
