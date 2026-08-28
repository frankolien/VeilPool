"use client";

import { AmountField, Button, Callout } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { WITHDRAW_STEPS, WRITE_STAGE_TO_WITHDRAW_STEP } from "@/domain/transactions/flows";
import { productError } from "@/domain/errors/taxonomy";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useAmountInput } from "@/features/transactions/useAmountInput";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import { useConfidentialAmount } from "@/features/decrypt/useConfidentialAmount";

/**
 * Principal withdrawal.
 *
 * The product's central promise is that this is always available and always
 * whole. It gets its own card, worded to say so, rather than being a secondary
 * mode of the deposit form.
 */
export function WithdrawCard({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const gateway = useGateway();
  const checklist = useDemoChecklist();
  const principal = useConfidentialAmount(user.principal);

  const amount = useAmountInput(principal.value === null ? {} : { max: principal.value });

  const action = useWriteAction({
    steps: WITHDRAW_STEPS,
    stageMap: WRITE_STAGE_TO_WITHDRAW_STEP,
    operation: "withdraw",
    onSuccess: () => {
      checklist.markComplete("withdraw");
      amount.clear();
    },
  });

  const drawSealing = pool.draw.status === "sealing";

  const submit = () =>
    void action.execute(async (context) => {
      const value = await context.step("validate", () => {
        if (!amount.isValid || amount.value === null) throw productError("zero-ciphertext-handle");
        if (drawSealing) throw productError("draw-in-progress");
        return amount.value;
      });

      return (await gateway.withdraw(value, context.tracked)).hash;
    });

  return (
    <ActionCard
      id="withdraw"
      title="Withdraw principal"
      description="Your principal is never used as prize money. It is withdrawable in full, whether or not you have ever won."
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Withdraw more"
    >
      {!user.isParticipant ? (
        <Callout tone="info">You have no principal in the pool yet.</Callout>
      ) : null}

      {drawSealing ? (
        <Callout tone="info" title="A draw is being sealed">
          Withdrawals pause while the encrypted scan runs. Your principal is unaffected and
          becomes available again as soon as the draw settles.
        </Callout>
      ) : null}

      <AmountField
        label="Amount to withdraw"
        value={amount.text}
        onValueChange={amount.setText}
        symbol={pool.asset.confidential.symbol}
        disabled={action.isBusy || !user.isParticipant || drawSealing}
        {...(amount.error ? { error: amount.error } : {})}
        {...(principal.value !== null
          ? { onMax: () => amount.setValue(principal.value ?? 0n) }
          : {})}
        hint={
          principal.value === null
            ? "Your principal is encrypted. Reveal it in the private vault to withdraw an exact amount."
            : "Withdrawn principal returns to your confidential cUSDT balance."
        }
      />

      <Button
        onClick={submit}
        variant="secondary"
        loading={action.isBusy}
        disabled={action.isBusy || !amount.isValid || !user.isParticipant || drawSealing}
        fullWidth
      >
        Encrypt and withdraw
      </Button>
    </ActionCard>
  );
}
