import type { Hash } from "viem";
import type { ProductError } from "../errors/taxonomy";

/**
 * A determinate multi-step flow.
 *
 * Loose booleans (`isLoading`, `isApproving`, `hasFailed`) make illegal states
 * representable and give the user a spinner. A flow is instead an ordered list of
 * named steps plus a position, which lets the UI show exactly where the user is,
 * what already succeeded, and — when something fails — which step failed. That
 * last property matters most: "failed while confirming" and "failed before
 * signing" have different answers to "did my money move?".
 *
 * This module is pure. It has no React and no chain dependency, so every flow is
 * testable as a reducer.
 */

export type FlowStep<Id extends string> = {
  readonly id: Id;
  /** Present tense, shown while the step runs: "Encrypting your amount". */
  readonly active: string;
  /** Past tense, shown once the step is behind us: "Amount encrypted". */
  readonly done: string;
  /**
   * Steps that may not run, such as an approval the user already granted.
   * Skipped steps are rendered as skipped rather than silently removed, so the
   * flow the user sees is the flow the protocol actually requires.
   */
  readonly optional?: boolean;
};

export type FlowState<Id extends string> =
  | { readonly status: "idle" }
  | {
      readonly status: "active";
      readonly step: Id;
      readonly completed: readonly Id[];
      readonly skipped: readonly Id[];
    }
  | {
      readonly status: "succeeded";
      readonly completed: readonly Id[];
      readonly skipped: readonly Id[];
      readonly hash?: Hash;
    }
  | {
      readonly status: "failed";
      readonly step: Id;
      readonly completed: readonly Id[];
      readonly skipped: readonly Id[];
      readonly error: ProductError;
    };

export type FlowAction<Id extends string> =
  /** Completes whichever step is active and makes `step` the active one. */
  | { readonly type: "enter"; readonly step: Id }
  /** Records that `step` was not required. Does not change the active step. */
  | { readonly type: "markSkipped"; readonly step: Id }
  | { readonly type: "succeed"; readonly hash?: Hash }
  | { readonly type: "fail"; readonly error: ProductError }
  | { readonly type: "reset" };

export const IDLE = { status: "idle" } as const;

/**
 * Steps are named explicitly rather than advanced positionally.
 *
 * A positional `advance()` silently does the wrong thing when a flow branches —
 * skipping an approval would shift every later step by one. Naming the step
 * being entered makes a branch a local decision instead of an offset the caller
 * has to track.
 */
export function flowReducer<Id extends string>(
  state: FlowState<Id>,
  action: FlowAction<Id>,
): FlowState<Id> {
  switch (action.type) {
    case "enter": {
      if (state.status === "succeeded" || state.status === "failed") return state;
      const completed =
        state.status === "active" ? [...state.completed, state.step] : [];
      const skipped = state.status === "active" ? state.skipped : [];
      return { status: "active", step: action.step, completed, skipped };
    }

    case "markSkipped": {
      if (state.status !== "active") return state;
      if (state.skipped.includes(action.step)) return state;
      return { ...state, skipped: [...state.skipped, action.step] };
    }

    case "succeed": {
      if (state.status !== "active") return state;
      const completed = [...state.completed, state.step];
      return action.hash === undefined
        ? { status: "succeeded", completed, skipped: state.skipped }
        : { status: "succeeded", completed, skipped: state.skipped, hash: action.hash };
    }

    case "fail": {
      if (state.status !== "active") return state;
      return {
        status: "failed",
        step: state.step,
        completed: state.completed,
        skipped: state.skipped,
        error: action.error,
      };
    }

    case "reset":
      return IDLE;
  }
}

export type StepPresentation = "pending" | "active" | "done" | "skipped" | "failed";

/** How a step should render given the current state. Drives the stepper UI. */
export function presentStep<Id extends string>(
  state: FlowState<Id>,
  stepId: Id,
): StepPresentation {
  if (state.status === "idle") return "pending";
  if (state.skipped.includes(stepId)) return "skipped";
  if (state.completed.includes(stepId)) return "done";
  if (state.status === "failed" && state.step === stepId) return "failed";
  if (state.status === "active" && state.step === stepId) return "active";
  return "pending";
}

export function isSettled<Id extends string>(state: FlowState<Id>): boolean {
  return state.status === "succeeded" || state.status === "failed";
}

export function isBusy<Id extends string>(state: FlowState<Id>): boolean {
  return state.status === "active";
}

export function errorOf<Id extends string>(state: FlowState<Id>): ProductError | null {
  return state.status === "failed" ? state.error : null;
}
