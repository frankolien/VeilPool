"use client";

import type { ReactNode } from "react";
import { Button, Card, CardHeader } from "@veil/ui";
import type { ProtocolOperation } from "@/domain/privacy/receipt";
import type { ProductError } from "@/domain/errors/taxonomy";
import type { StepperItem } from "@veil/ui";
import { ErrorNotice } from "./ErrorNotice";
import { PrivacyReceiptCard } from "./PrivacyReceiptCard";
import { TransactionProgress } from "./TransactionProgress";
import styles from "./ActionCard.module.css";

/**
 * The shape every protocol action takes.
 *
 * Form, then progress, then outcome — in that order, every time. A user who has
 * learned where the receipt appears after shielding does not have to learn it
 * again for depositing, and consistency here is what makes an unfamiliar
 * protocol feel navigable.
 */
export type ActionCardProps = {
  readonly id?: string;
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly children: ReactNode;
  readonly steps: readonly StepperItem[];
  readonly isBusy: boolean;
  readonly isComplete: boolean;
  readonly error: ProductError | null;
  readonly receipt: ProtocolOperation | null;
  readonly hash: string | null;
  readonly onReset: () => void;
  readonly completionLabel?: string;
  readonly headerAction?: ReactNode;
};

export function ActionCard({
  id,
  title,
  description,
  children,
  steps,
  isBusy,
  isComplete,
  error,
  receipt,
  hash,
  onReset,
  completionLabel = "Do this again",
  headerAction,
}: ActionCardProps) {
  return (
    <Card id={id} className={styles.card}>
      <CardHeader
        title={title}
        {...(description ? { description } : {})}
        {...(headerAction ? { action: headerAction } : {})}
      />

      {isComplete && receipt ? (
        <div className={styles.stack}>
          <PrivacyReceiptCard operation={receipt} hash={hash} />
          <Button variant="secondary" onClick={onReset}>
            {completionLabel}
          </Button>
        </div>
      ) : (
        <div className={styles.stack}>
          {children}
          <TransactionProgress steps={steps} visible={isBusy || error !== null} />
          {error ? <ErrorNotice error={error} onRetry={onReset} /> : null}
        </div>
      )}
    </Card>
  );
}
