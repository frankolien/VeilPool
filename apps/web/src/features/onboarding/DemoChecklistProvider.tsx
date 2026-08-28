"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * The guided demo checklist.
 *
 * A reviewer walking VEIL Pool for the first time should never have to guess
 * what to do next. Progress is derived from protocol state wherever the chain
 * can answer the question — being a participant is a fact, not a claim — and
 * only falls back to a recorded mark where the answer is encrypted and therefore
 * unknowable to the app.
 *
 * Marks are held in memory. They are not sensitive, but they are also not worth
 * persisting: on reload the derived signals reconstruct almost everything, and a
 * checklist that disagrees with the chain is worse than one that resets.
 */

export type DemoStepId =
  | "get-tokens"
  | "shield"
  | "authorize"
  | "deposit"
  | "reveal"
  | "draw"
  | "check-result"
  | "claim"
  | "withdraw";

export type DemoStep = {
  readonly id: DemoStepId;
  readonly title: string;
  readonly description: string;
  readonly href: string;
};

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: "get-tokens",
    title: "Get test tokens",
    description: "Mint mock USDT on Sepolia. It has no value.",
    href: "/pool#faucet",
  },
  {
    id: "shield",
    title: "Shield into cUSDT",
    description: "Convert public USDT into confidential cUSDT.",
    href: "/pool#shield",
  },
  {
    id: "authorize",
    title: "Authorise the pool",
    description: "Let the pool move your confidential tokens.",
    href: "/pool#deposit",
  },
  {
    id: "deposit",
    title: "Deposit privately",
    description: "Your amount is encrypted before it leaves the browser.",
    href: "/pool#deposit",
  },
  {
    id: "reveal",
    title: "Reveal your balance",
    description: "Sign once to decrypt your own figures locally.",
    href: "/vault",
  },
  {
    id: "draw",
    title: "Run the draw",
    description: "Selection happens on-chain over encrypted balances.",
    href: "/draws",
  },
  {
    id: "check-result",
    title: "Check your result",
    description: "Only you can see whether you won.",
    href: "/vault",
  },
  {
    id: "claim",
    title: "Claim winnings",
    description: "Move encrypted winnings back to your cUSDT balance.",
    href: "/vault",
  },
  {
    id: "withdraw",
    title: "Withdraw principal",
    description: "Your principal was never at stake.",
    href: "/pool#withdraw",
  },
];

export type DemoChecklist = {
  readonly completed: ReadonlySet<DemoStepId>;
  readonly next: DemoStep | null;
  readonly markComplete: (step: DemoStepId) => void;
  /** Folds in facts the chain can answer directly. */
  readonly applyDerived: (derived: readonly DemoStepId[]) => void;
  readonly reset: () => void;
};

const DemoChecklistContext = createContext<DemoChecklist | null>(null);

export function DemoChecklistProvider({ children }: { readonly children: ReactNode }) {
  const [completed, setCompleted] = useState<ReadonlySet<DemoStepId>>(new Set());

  const markComplete = useCallback((step: DemoStepId) => {
    setCompleted((previous) => (previous.has(step) ? previous : new Set(previous).add(step)));
  }, []);

  const applyDerived = useCallback((derived: readonly DemoStepId[]) => {
    setCompleted((previous) => {
      const missing = derived.filter((step) => !previous.has(step));
      if (missing.length === 0) return previous;
      const next = new Set(previous);
      for (const step of missing) next.add(step);
      return next;
    });
  }, []);

  const value = useMemo<DemoChecklist>(
    () => ({
      completed,
      next: DEMO_STEPS.find((step) => !completed.has(step.id)) ?? null,
      markComplete,
      applyDerived,
      reset: () => setCompleted(new Set()),
    }),
    [completed, markComplete, applyDerived],
  );

  return (
    <DemoChecklistContext.Provider value={value}>{children}</DemoChecklistContext.Provider>
  );
}

export function useDemoChecklist(): DemoChecklist {
  const value = useContext(DemoChecklistContext);
  if (!value) throw new Error("useDemoChecklist must be used inside DemoChecklistProvider");
  return value;
}
