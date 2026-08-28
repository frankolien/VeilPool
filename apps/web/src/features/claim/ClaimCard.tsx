"use client";

import { Button, Callout } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { CLAIM_STEPS, WRITE_STAGE_TO_CLAIM_STEP } from "@/domain/transactions/flows";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import { ConfidentialAmount } from "@/features/decrypt/ConfidentialAmount";
import styles from "./ClaimCard.module.css";

/**
 * Claiming winnings.
 *
 * Claiming is a public call, and a claim shortly after a draw is the strongest
 * signal in the system about who won. The card says so before the button rather
 * than in a footnote after it — a privacy product that lets a user leak by
 * accident has failed at the only thing it promised.
 */
export function ClaimCard({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const gateway = useGateway();
  const checklist = useDemoChecklist();

  const action = useWriteAction({
    steps: CLAIM_STEPS,
    stageMap: WRITE_STAGE_TO_CLAIM_STEP,
    operation: "claim",
    onSuccess: () => checklist.markComplete("claim"),
  });

  const hasPosition = user.unclaimedWinnings.status !== "unavailable";

  return (
    <ActionCard
      title="Unclaimed winnings"
      description="Winnings are credited under encryption. Claiming moves them into your confidential balance."
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Done"
    >
      <div className={styles.value}>
        <ConfidentialAmount
          source={user.unclaimedWinnings}
          label="your unclaimed winnings"
          symbol={pool.asset.confidential.symbol}
          size="xl"
          emptyLabel="Nothing yet"
        />
      </div>

      <Callout tone="warning" title="Claiming is public">
        The pool cannot see who is claiming what — the amount stays encrypted — but the call
        itself is on-chain. Claiming immediately after a draw suggests you won it. Waiting, or
        claiming alongside other activity, is stronger.
      </Callout>

      <Button
        onClick={() =>
          void action.execute(async (context) => (await gateway.claimWinnings(context.tracked)).hash)
        }
        variant="prize"
        loading={action.isBusy}
        disabled={action.isBusy || !hasPosition}
        fullWidth
      >
        Claim winnings
      </Button>
    </ActionCard>
  );
}
