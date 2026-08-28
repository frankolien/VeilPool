"use client";

import { AmountField, Button, Callout, Mono } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { formatAmount } from "@/domain/money/amount";
import { SHIELD_STEPS, WRITE_STAGE_TO_SHIELD_STEP } from "@/domain/transactions/flows";
import { productError } from "@/domain/errors/taxonomy";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useAmountInput } from "@/features/transactions/useAmountInput";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import styles from "./ShieldCard.module.css";

/**
 * The public-to-confidential boundary.
 *
 * This is the one screen where the product has to argue against itself: the
 * amount being shielded is public, and saying so plainly here is what makes the
 * privacy claims on every other screen credible.
 */
export function ShieldCard({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const gateway = useGateway();
  const checklist = useDemoChecklist();

  const amount = useAmountInput({
    max: user.underlyingBalance,
    maxMessage: `You have ${formatAmount(user.underlyingBalance)} ${pool.asset.underlying.symbol}`,
  });

  const action = useWriteAction({
    steps: SHIELD_STEPS,
    stageMap: WRITE_STAGE_TO_SHIELD_STEP,
    operation: "shield",
    onSuccess: () => {
      checklist.markComplete("shield");
      amount.clear();
    },
  });

  const submit = () =>
    void action.execute(async (context) => {
      const value = await context.step("validate", () => {
        if (!amount.isValid || amount.value === null) throw productError("insufficient-underlying");
        return amount.value;
      });

      if (user.wrapperAllowance < value) {
        await context.step("approve", () => gateway.approveWrapper(value, {}));
      } else {
        context.skip("approve");
      }

      return (await gateway.shield(value, context.tracked)).hash;
    });

  return (
    <ActionCard
      id="shield"
      title="Shield into cUSDT"
      description="Convert public USDT into the confidential token the pool accepts."
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Shield more"
    >
      <Callout tone="warning" title="This step is public">
        Wrapping moves a public ERC-20 amount, so the amount you shield is visible on-chain.
        Privacy begins once your balance is confidential. Shielding and then immediately
        depositing lets an observer link the two — depositing cUSDT you already hold is
        stronger.
      </Callout>

      <AmountField
        label={`Amount to shield`}
        value={amount.text}
        onValueChange={amount.setText}
        symbol={pool.asset.underlying.symbol}
        disabled={action.isBusy}
        {...(amount.error ? { error: amount.error } : {})}
        onMax={() => amount.setValue(user.underlyingBalance)}
        maxHint={
          <>
            Balance <Mono size="sm">{formatAmount(user.underlyingBalance)}</Mono>
          </>
        }
      />

      <div className={styles.pathway} aria-hidden="true">
        <span className={styles.public}>{pool.asset.underlying.symbol}</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.wrapper}>Wrapper</span>
        <span className={styles.arrow}>→</span>
        <span className={styles.confidential}>{pool.asset.confidential.symbol}</span>
      </div>

      <Button
        onClick={submit}
        loading={action.isBusy}
        disabled={action.isBusy || !amount.isValid}
        fullWidth
      >
        Shield
      </Button>
    </ActionCard>
  );
}
