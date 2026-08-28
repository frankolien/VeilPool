"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, Meter, clsx } from "@veil/ui";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useReveal } from "@/features/decrypt/RevealProvider";
import { DEMO_STEPS, useDemoChecklist, type DemoStepId } from "./DemoChecklistProvider";
import styles from "./DemoChecklistPanel.module.css";

/**
 * The standing "what do I do next" panel.
 *
 * Progress is reconciled against chain state on every render, so a reviewer who
 * reloads, or who did part of the flow in a previous session, does not see a
 * checklist that has forgotten what the chain already knows.
 */
export function DemoChecklistPanel({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const checklist = useDemoChecklist();
  const reveal = useReveal();

  useEffect(() => {
    const derived: DemoStepId[] = [];
    if (user.underlyingBalance > 0n) derived.push("get-tokens");
    if (user.hasPoolOperatorApproval) derived.push("authorize");
    if (user.isParticipant) {
      derived.push("get-tokens", "shield", "authorize", "deposit");
    }
    if (reveal.hasSession) derived.push("reveal");
    if (pool.draw.status === "awarded") derived.push("draw");
    if (derived.length > 0) checklist.applyDerived(derived);
  }, [user, pool.draw.status, reveal.hasSession, checklist]);

  const done = checklist.completed.size;
  const total = DEMO_STEPS.length;

  return (
    <Card padding="md" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Guided walkthrough</h2>
        <span className={styles.count}>
          {done} of {total}
        </span>
      </div>

      <Meter
        ratio={done / total}
        label="Walkthrough progress"
        valueText={`${done} of ${total} steps complete`}
      />

      <ol className={styles.steps}>
        {DEMO_STEPS.map((step) => {
          const complete = checklist.completed.has(step.id);
          const isNext = checklist.next?.id === step.id;
          return (
            <li
              key={step.id}
              className={clsx(styles.step, complete && styles.complete, isNext && styles.next)}
            >
              <span className={styles.glyph} aria-hidden="true">
                {complete ? "✓" : isNext ? "→" : "○"}
              </span>
              <Link href={step.href} className={styles.stepLink}>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepDescription}>{step.description}</span>
              </Link>
              {isNext ? <span className={styles.nextTag}>Next</span> : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
