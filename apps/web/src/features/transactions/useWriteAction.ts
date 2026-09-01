"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Hash } from "viem";
import type { StepperItem } from "@veil/ui";
import {
  type FlowState,
  type FlowStep,
  IDLE,
  flowReducer,
  presentStep,
} from "@/domain/transactions/flow";
import type { WriteOptions, WriteStage } from "@/domain/pool/gateway";
import { normalizeError } from "@/domain/errors/normalize";
import type { ProductError } from "@/domain/errors/taxonomy";
import type { ProtocolOperation } from "@/domain/privacy/receipt";
import { productError } from "@/domain/errors/taxonomy";
import { useRefreshPool } from "@/features/pool/queries";

/**
 * One write, end to end.
 *
 * Every mutating action in the product — mint, approve, shield, deposit,
 * withdraw, seal, claim — needs the same six things: a step machine, a
 * translation from gateway stages to steps, error normalisation, a chain
 * refresh, a privacy receipt, and a way to reset. Writing that six times would
 * guarantee six subtly different behaviours, so it is written once here and each
 * feature supplies only what is genuinely its own: which steps exist, and what
 * to actually call.
 */

export type WriteActionContext<Id extends string> = {
  /** Marks `id` active, runs `work`, and leaves `id` complete. */
  readonly step: <T>(id: Id, work: () => Promise<T> | T) => Promise<T>;
  /** Records that `id` was not required for this run. */
  readonly skip: (id: Id) => void;
  /**
   * `WriteOptions` whose stage reports are mapped onto this flow's steps, so a
   * gateway call drives the stepper without the feature wiring anything.
   */
  readonly tracked: WriteOptions;
};

export type WriteActionConfig<Id extends string> = {
  readonly steps: readonly FlowStep<Id>[];
  readonly stageMap: Readonly<Record<WriteStage, Id | null>>;
  /** Which privacy receipt to show on success. */
  readonly operation: ProtocolOperation;
  readonly onSuccess?: () => void;
};

export type WriteAction<Id extends string> = {
  readonly state: FlowState<Id>;
  readonly steps: readonly StepperItem[];
  readonly error: ProductError | null;
  readonly isBusy: boolean;
  readonly isComplete: boolean;
  readonly hash: Hash | null;
  readonly receipt: ProtocolOperation | null;
  readonly execute: (run: (context: WriteActionContext<Id>) => Promise<Hash | void>) => Promise<void>;
  readonly reset: () => void;
};

export function useWriteAction<Id extends string>(
  config: WriteActionConfig<Id>,
): WriteAction<Id> {
  const [state, dispatch] = useReducer(flowReducer<Id>, IDLE as FlowState<Id>);
  const [hash, setHash] = useState<Hash | null>(null);
  const refresh = useRefreshPool();

  // `execute` must not change identity when config callbacks do, or a caller
  // that memoises a submit handler would capture a stale run.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const execute = useCallback(
    async (run: (context: WriteActionContext<Id>) => Promise<Hash | void>) => {
      const { stageMap, onSuccess } = configRef.current;
      setHash(null);
      let latestStage: WriteStage | null = null;

      const context: WriteActionContext<Id> = {
        step: async (id, work) => {
          dispatch({ type: "enter", step: id });
          return await work();
        },
        skip: (id) => dispatch({ type: "markSkipped", step: id }),
        tracked: {
          report: (stage: WriteStage) => {
            latestStage = stage;
            const step = stageMap[stage];
            if (step) dispatch({ type: "enter", step });
          },
        },
      };

      try {
        const result = await run(context);

        // A returned hash means the gateway waited for a receipt. Preserve that
        // fact before refreshing: a later RPC read failure must never make a
        // confirmed write look uncertain or invite a duplicate submission.
        const settledHash = typeof result === "string" ? result : null;
        setHash(settledHash);

        // The refresh is part of the flow, not an afterthought: the run is only
        // complete once the UI shows post-transaction state.
        const refreshStep = stageMap.refreshing;
        if (refreshStep) dispatch({ type: "enter", step: refreshStep });
        try {
          await refresh();
        } catch (refreshCause) {
          if (settledHash) {
            const underlying = normalizeError(refreshCause);
            dispatch({
              type: "fail",
              error: productError("refresh-failed-after-confirmation", underlying.technical),
            });
            return;
          }
          throw refreshCause;
        }

        dispatch(settledHash ? { type: "succeed", hash: settledHash } : { type: "succeed" });
        onSuccess?.();
      } catch (cause) {
        const normalized = normalizeError(cause);
        dispatch({
          type: "fail",
          error:
            normalized.code === "unknown" && latestStage === "encrypting"
              ? productError("encryption-preparation-failed", normalized.technical)
              : normalized,
        });
      }
    },
    [refresh],
  );

  const steps = useMemo<readonly StepperItem[]>(
    () =>
      config.steps.map((step) => {
        const presentation = presentStep(state, step.id);
        const done = presentation === "done" || presentation === "skipped";
        return { id: step.id, label: done ? step.done : step.active, state: presentation };
      }),
    [config.steps, state],
  );

  return {
    state,
    steps,
    error: state.status === "failed" ? state.error : null,
    isBusy: state.status === "active",
    isComplete: state.status === "succeeded",
    hash,
    receipt: state.status === "succeeded" ? config.operation : null,
    execute,
    reset: useCallback(() => {
      setHash(null);
      dispatch({ type: "reset" });
    }, []),
  };
}
