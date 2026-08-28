import { selectWeightedIndex } from "./weightedSelection.js";

export type AccountId = string;

export type AccountState = {
  principal: bigint;
  winnings: bigint;
};

export type DrawResult = {
  drawId: bigint;
  winner: AccountId;
  prize: bigint;
  target: bigint;
};

export class PrizePoolModel {
  readonly #accounts = new Map<AccountId, AccountState>();
  readonly #participants: AccountId[] = [];
  #totalPrincipal = 0n;
  #reserve = 0n;
  #drawId = 1n;
  #lastAwardedDrawId = 0n;

  get totalPrincipal(): bigint {
    return this.#totalPrincipal;
  }

  get reserve(): bigint {
    return this.#reserve;
  }

  get drawId(): bigint {
    return this.#drawId;
  }

  get participants(): readonly AccountId[] {
    return this.#participants;
  }

  account(id: AccountId): Readonly<AccountState> {
    return this.#accounts.get(id) ?? { principal: 0n, winnings: 0n };
  }

  fundReserve(amount: bigint): void {
    assertNonNegative(amount, "reserve funding");
    this.#reserve += amount;
    this.assertInvariants();
  }

  deposit(id: AccountId, actualTransferred: bigint): void {
    assertNonNegative(actualTransferred, "deposit");
    const account = this.#getOrRegister(id);
    account.principal += actualTransferred;
    this.#totalPrincipal += actualTransferred;
    this.assertInvariants();
  }

  withdraw(id: AccountId, requested: bigint): bigint {
    assertNonNegative(requested, "withdrawal");
    const account = this.#getOrRegister(id);
    const transferred = requested <= account.principal ? requested : 0n;
    account.principal -= transferred;
    this.#totalPrincipal -= transferred;
    this.assertInvariants();
    return transferred;
  }

  award(prize: bigint, target: bigint): DrawResult {
    if (this.#lastAwardedDrawId === this.#drawId) throw new Error("draw already awarded");
    if (prize <= 0n) throw new RangeError("prize must be positive");
    if (prize > this.#reserve) throw new RangeError("insufficient prize reserve");

    const weights = this.#participants.map((id) => this.#requireAccount(id).principal);
    const selection = selectWeightedIndex(weights, target);
    const winner = this.#participants[selection.winnerIndex];
    if (winner === undefined) throw new Error("winner index is not registered");

    this.#requireAccount(winner).winnings += prize;
    this.#reserve -= prize;
    this.#lastAwardedDrawId = this.#drawId;
    this.assertInvariants();

    return { drawId: this.#drawId, winner, prize, target };
  }

  openNextDraw(): void {
    if (this.#lastAwardedDrawId !== this.#drawId) {
      throw new Error("current draw has not been awarded");
    }
    this.#drawId += 1n;
  }

  claim(id: AccountId): bigint {
    const account = this.#getOrRegister(id);
    const claimed = account.winnings;
    account.winnings = 0n;
    this.assertInvariants();
    return claimed;
  }

  totalWinnings(): bigint {
    return [...this.#accounts.values()].reduce((sum, account) => sum + account.winnings, 0n);
  }

  assertInvariants(): void {
    const principalSum = [...this.#accounts.values()].reduce(
      (sum, account) => sum + account.principal,
      0n,
    );
    if (principalSum !== this.#totalPrincipal) {
      throw new Error("principal conservation invariant violated");
    }
    if (this.#totalPrincipal < 0n || this.#reserve < 0n || this.totalWinnings() < 0n) {
      throw new Error("non-negative accounting invariant violated");
    }
  }

  #getOrRegister(id: AccountId): AccountState {
    const existing = this.#accounts.get(id);
    if (existing !== undefined) return existing;

    const account = { principal: 0n, winnings: 0n };
    this.#accounts.set(id, account);
    this.#participants.push(id);
    return account;
  }

  #requireAccount(id: AccountId): AccountState {
    const account = this.#accounts.get(id);
    if (account === undefined) throw new Error(`unknown account: ${id}`);
    return account;
  }
}

function assertNonNegative(value: bigint, label: string): void {
  if (value < 0n) throw new RangeError(`${label} must be non-negative`);
}
