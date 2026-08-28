"use client";

import { useState } from "react";
import { Button, Callout } from "@veil/ui";
import type { FundsImpact, ProductError, Recovery } from "@/domain/errors/taxonomy";
import styles from "./ErrorNotice.module.css";

const FUNDS_WORDING: Readonly<Record<FundsImpact, string>> = {
  untouched: "Your balances are unchanged.",
  "reverted-gas-only": "Nothing moved. Only gas was spent.",
  moved: "Funds moved. Read the detail above before taking another action.",
  unknown: "We cannot confirm whether this went through.",
};

const RECOVERY_WORDING: Readonly<Record<Recovery, string>> = {
  retry: "Safe to try again.",
  "fix-then-retry": "Safe to try again once the step above is done.",
  wait: "Try again shortly.",
  "no-retry": "Retrying will not change the outcome.",
};

/**
 * A failed action, explained.
 *
 * Every notice answers the same three questions in the same order — what
 * happened, what happened to your money, whether retrying is safe — because a
 * user who has just watched a transaction fail is not in a state to hunt for
 * them. The raw message is available behind a disclosure and is never sent
 * anywhere.
 */
export function ErrorNotice({
  error,
  onRetry,
  onDismiss,
}: {
  readonly error: ProductError;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const canRetry = onRetry && error.recovery !== "no-retry";

  return (
    <Callout
      tone="danger"
      title={error.title}
      action={
        canRetry ? (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : onDismiss ? (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : undefined
      }
    >
      <p className={styles.detail}>{error.detail}</p>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Your funds</dt>
          <dd>{FUNDS_WORDING[error.fundsImpact]}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Retrying</dt>
          <dd>{RECOVERY_WORDING[error.recovery]}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Next</dt>
          <dd className={styles.nextAction}>{error.nextAction}</dd>
        </div>
      </dl>

      {error.technical ? (
        <div className={styles.technical}>
          <button
            type="button"
            className={styles.disclosure}
            onClick={() => setShowTechnical((open) => !open)}
            aria-expanded={showTechnical}
          >
            {showTechnical ? "Hide technical detail" : "Show technical detail"}
          </button>
          {showTechnical ? <pre className={styles.pre}>{error.technical}</pre> : null}
        </div>
      ) : null}
    </Callout>
  );
}
