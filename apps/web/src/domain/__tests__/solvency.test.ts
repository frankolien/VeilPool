import { describe, expect, it } from "vitest";

type Account = "alice" | "bob";
type State = {
  principal: Record<Account, bigint>;
  winnings: Record<Account, bigint>;
  reserve: bigint;
  depositsPaused: boolean;
  drawsPaused: boolean;
};

type Operation =
  | { kind: "deposit"; account: Account; amount: bigint }
  | { kind: "withdraw"; account: Account; amount: bigint }
  | { kind: "fund"; amount: bigint }
  | { kind: "draw"; winner: Account; prize: bigint }
  | { kind: "claim"; account: Account }
  | { kind: "pause"; deposits: boolean; draws: boolean };

const ZERO: State = {
  principal: { alice: 0n, bob: 0n },
  winnings: { alice: 0n, bob: 0n },
  reserve: 0n,
  depositsPaused: false,
  drawsPaused: false,
};

function step(state: State, operation: Operation): State {
  const next = structuredClone(state);
  switch (operation.kind) {
    case "deposit":
      if (!next.depositsPaused) next.principal[operation.account] += operation.amount;
      break;
    case "withdraw":
      // Production semantics deliberately transfer zero for an over-request.
      if (operation.amount <= next.principal[operation.account]) {
        next.principal[operation.account] -= operation.amount;
      }
      break;
    case "fund":
      next.reserve += operation.amount;
      break;
    case "draw":
      if (!next.drawsPaused && next.reserve >= operation.prize && totalPrincipal(next) > 0n) {
        next.reserve -= operation.prize;
        next.winnings[operation.winner] += operation.prize;
      }
      break;
    case "claim":
      next.winnings[operation.account] = 0n;
      break;
    case "pause":
      next.depositsPaused = operation.deposits;
      next.drawsPaused = operation.draws;
  }
  return next;
}

function totalPrincipal(state: State): bigint {
  return state.principal.alice + state.principal.bob;
}

function assertSolventTransition(before: State, after: State, operation: Operation): void {
  expect(totalPrincipal(after)).toBeGreaterThanOrEqual(0n);
  expect(after.reserve).toBeGreaterThanOrEqual(0n);
  expect(after.winnings.alice).toBeGreaterThanOrEqual(0n);
  expect(after.winnings.bob).toBeGreaterThanOrEqual(0n);

  if (operation.kind === "draw" || operation.kind === "fund" || operation.kind === "claim" || operation.kind === "pause") {
    expect(totalPrincipal(after)).toBe(totalPrincipal(before));
  }
  if (operation.kind === "withdraw" || operation.kind === "deposit" || operation.kind === "claim" || operation.kind === "pause") {
    expect(after.reserve).toBe(before.reserve);
  }
}

const OPERATIONS: readonly Operation[] = [
  { kind: "deposit", account: "alice", amount: 1n },
  { kind: "deposit", account: "bob", amount: 2n },
  { kind: "withdraw", account: "alice", amount: 1n },
  { kind: "withdraw", account: "bob", amount: 3n },
  { kind: "fund", amount: 2n },
  { kind: "draw", winner: "alice", prize: 2n },
  { kind: "claim", account: "alice" },
  { kind: "pause", deposits: true, draws: true },
  { kind: "pause", deposits: false, draws: false },
] as const;

describe("principal/prize solvency model", () => {
  it("preserves the accounting boundary across every operation sequence through depth five", () => {
    let frontier: State[] = [ZERO];
    for (let depth = 0; depth < 5; depth += 1) {
      const nextFrontier = new Map<string, State>();
      for (const state of frontier) {
        for (const operation of OPERATIONS) {
          const next = step(state, operation);
          assertSolventTransition(state, next, operation);
          nextFrontier.set(stateKey(next), next);
        }
      }
      frontier = [...nextFrontier.values()];
    }
  });

  it("keeps withdrawals and claims available while both risk-adding paths are paused", () => {
    const funded = step(step(ZERO, { kind: "deposit", account: "alice", amount: 4n }), { kind: "fund", amount: 2n });
    const awarded = step(funded, { kind: "draw", winner: "alice", prize: 2n });
    const paused = step(awarded, { kind: "pause", deposits: true, draws: true });
    const withdrawn = step(paused, { kind: "withdraw", account: "alice", amount: 4n });
    const claimed = step(withdrawn, { kind: "claim", account: "alice" });

    expect(withdrawn.principal.alice).toBe(0n);
    expect(claimed.winnings.alice).toBe(0n);
  });
});

function stateKey(state: State): string {
  return [
    state.principal.alice,
    state.principal.bob,
    state.winnings.alice,
    state.winnings.bob,
    state.reserve,
    state.depositsPaused ? 1 : 0,
    state.drawsPaused ? 1 : 0,
  ].join(":");
}
