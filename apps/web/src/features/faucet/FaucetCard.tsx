"use client";

import { Button, Mono } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { FAUCET_MINT_AMOUNT } from "@/config/product";
import { formatAmount } from "@/domain/money/amount";
import { CLAIM_STEPS, WRITE_STAGE_TO_CLAIM_STEP } from "@/domain/transactions/flows";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import styles from "./FaucetCard.module.css";

/**
 * Test tokens.
 *
 * The first thing a reviewer needs and the first place a demo stalls. Mint size
 * is fixed rather than free-form: choosing an amount here is a decision with no
 * consequence, and removing it saves a step.
 */
export function FaucetCard({
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
    operation: "faucet",
    onSuccess: () => checklist.markComplete("get-tokens"),
  });

  const symbol = pool.asset.underlying.symbol;

  return (
    <ActionCard
      id="faucet"
      title="Get test tokens"
      description={`Mint mock ${symbol} on Sepolia. It has no value and exists only to exercise the flow.`}
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Mint more"
    >
      <div className={styles.row}>
        <div>
          <p className={styles.label}>Your public balance</p>
          <Mono size="lg">
            {formatAmount(user.underlyingBalance)} {symbol}
          </Mono>
        </div>
        <Button
          onClick={() =>
            void action.execute(async (context) =>
              (await gateway.mintFromFaucet(FAUCET_MINT_AMOUNT, context.tracked)).hash,
            )
          }
          loading={action.isBusy}
          disabled={action.isBusy}
        >
          {`Mint ${formatAmount(FAUCET_MINT_AMOUNT)} ${symbol}`}
        </Button>
      </div>

      <p className={styles.note}>
        You also need Sepolia ETH for gas.{" "}
        <a href="https://sepoliafaucet.com" target="_blank" rel="noreferrer noopener">
          Get Sepolia ETH ↗
        </a>
      </p>
    </ActionCard>
  );
}
