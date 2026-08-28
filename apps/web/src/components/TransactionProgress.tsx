"use client";

import { Stepper } from "@veil/ui";
import type { StepperItem } from "@veil/ui";
import styles from "./TransactionProgress.module.css";

/**
 * The stepper as it appears inside a flow card.
 *
 * Shown only once a flow is underway. Rendering an all-pending stepper before
 * the user has acted turns a form into a checklist of chores.
 */
export function TransactionProgress({
  steps,
  visible,
  label,
}: {
  readonly steps: readonly StepperItem[];
  readonly visible: boolean;
  readonly label?: string;
}) {
  if (!visible) return null;
  return (
    <div className={styles.wrapper}>
      <Stepper steps={steps} {...(label ? { liveLabel: label } : {})} />
    </div>
  );
}
