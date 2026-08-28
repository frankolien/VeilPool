import type { ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./Callout.module.css";

export type CalloutTone = "info" | "privacy" | "warning" | "danger" | "success";

export type CalloutProps = {
  readonly tone?: CalloutTone;
  readonly title?: ReactNode;
  readonly children: ReactNode;
  readonly action?: ReactNode;
};

/**
 * A block of standing context or a resolved failure.
 *
 * `danger` and `warning` render as `role="alert"` so a failure that appears
 * after a transaction is announced rather than silently painted below the fold.
 */
export function Callout({ tone = "info", title, children, action }: CalloutProps) {
  const assertive = tone === "danger" || tone === "warning";
  return (
    <div
      className={clsx(styles.callout, styles[tone])}
      role={assertive ? "alert" : undefined}
    >
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div className={styles.content}>{children}</div>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
