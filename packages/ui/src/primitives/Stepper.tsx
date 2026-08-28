import { clsx } from "../utils/clsx";
import { VisuallyHidden } from "./Text";
import styles from "./Stepper.module.css";

export type StepPresentation = "pending" | "active" | "done" | "skipped" | "failed";

export type StepperItem = {
  readonly id: string;
  readonly label: string;
  readonly state: StepPresentation;
};

export type StepperProps = {
  readonly steps: readonly StepperItem[];
  /** Announced to assistive technology when the active step changes. */
  readonly liveLabel?: string;
};

const GLYPH: Readonly<Record<StepPresentation, string>> = {
  pending: "○",
  active: "◐",
  done: "✓",
  skipped: "–",
  failed: "✕",
};

const STATE_WORD: Readonly<Record<StepPresentation, string>> = {
  pending: "not started",
  active: "in progress",
  done: "complete",
  skipped: "not required",
  failed: "failed",
};

/**
 * A determinate transaction stepper.
 *
 * Every step carries a glyph as well as a colour, and its state is spelled out
 * for screen readers. The whole list is a live region so that a user who is not
 * watching the screen still hears the flow progress — which is the point of
 * modelling flows as steps in the first place.
 */
export function Stepper({ steps, liveLabel }: StepperProps) {
  return (
    <ol className={styles.list} aria-live="polite" aria-label={liveLabel ?? "Transaction progress"}>
      {steps.map((step) => (
        <li key={step.id} className={clsx(styles.step, styles[step.state])}>
          <span className={styles.glyph} aria-hidden="true">
            {GLYPH[step.state]}
          </span>
          <span className={styles.label}>{step.label}</span>
          <VisuallyHidden>{` — ${STATE_WORD[step.state]}`}</VisuallyHidden>
        </li>
      ))}
    </ol>
  );
}
