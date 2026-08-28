"use client";

import { useState } from "react";
import { Button, Card, Mono, ProgressRing } from "@veil/ui";
import { SAVINGS_GOAL_PRESETS } from "@/config/product";
import { basisPoints, formatAmount, formatPercent } from "@/domain/money/amount";
import styles from "./SavingsGoal.module.css";

/**
 * A savings goal.
 *
 * Held in component state and compared against a locally decrypted principal.
 * It is never sent on-chain and never stored: a goal is a statement about
 * someone's finances, and this product has no business keeping one.
 *
 * With the principal still sealed there is nothing to measure, so the card asks
 * for a reveal rather than showing an empty ring — a ring at zero would read as
 * "you have saved nothing".
 */
export function SavingsGoal({
  principal,
  symbol,
}: {
  readonly principal: bigint | null;
  readonly symbol: string;
}) {
  const [goal, setGoal] = useState<bigint | null>(null);

  if (principal === null) {
    return (
      <Card padding="md" className={styles.card}>
        <p className={styles.label}>Savings goal</p>
        <p className={styles.empty}>
          Reveal your principal to track progress. The goal stays in this browser — it is never
          sent on-chain.
        </p>
      </Card>
    );
  }

  if (goal === null) {
    return (
      <Card padding="md" className={styles.card}>
        <p className={styles.label}>Savings goal</p>
        <p className={styles.prompt}>Pick a target</p>
        <div className={styles.presets}>
          {SAVINGS_GOAL_PRESETS.map((preset) => (
            <Button key={preset.toString()} size="sm" variant="secondary" onClick={() => setGoal(preset)}>
              {formatAmount(preset)}
            </Button>
          ))}
        </div>
      </Card>
    );
  }

  const bps = basisPoints(principal, goal);
  const reached = principal >= goal;

  return (
    <Card padding="md" className={styles.card}>
      <div className={styles.head}>
        <p className={styles.label}>Savings goal</p>
        <button type="button" className={styles.change} onClick={() => setGoal(null)}>
          Change
        </button>
      </div>

      <div className={styles.progress}>
        <ProgressRing
          ratio={reached ? 1 : (bps ?? 0) / 10_000}
          label="Savings goal progress"
          valueText={`${formatAmount(principal)} of ${formatAmount(goal)} ${symbol}`}
        />
        <div>
          <Mono size="lg">{bps === null ? "—" : formatPercent(Math.min(bps, 10_000), 0)}</Mono>
          <p className={styles.detail}>
            {formatAmount(principal)} of {formatAmount(goal)} {symbol}
          </p>
          {reached ? <p className={styles.reached}>Goal reached</p> : null}
        </div>
      </div>
    </Card>
  );
}
