"use client";

import { AmountField, Badge, Button, Callout } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { OPERATOR_APPROVAL_DAYS } from "@/config/product";
import { DEPOSIT_STEPS, WRITE_STAGE_TO_DEPOSIT_STEP } from "@/domain/transactions/flows";
import { productError } from "@/domain/errors/taxonomy";
import { isPoolAtCapacity, type PoolState, type UserState } from "@/domain/pool/types";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useAmountInput } from "@/features/transactions/useAmountInput";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import { useConfidentialAmount } from "@/features/decrypt/useConfidentialAmount";
import styles from "./DepositCard.module.css";

/**
 * The private deposit.
 *
 * There is no maximum to validate against: the balance being spent is
 * encrypted, so the app genuinely does not know it. Rather than invent a
 * ceiling, the form says so and offers to reveal — which is both honest and the
 * single best demonstration of what this protocol is for.
 */
export function DepositCard({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const gateway = useGateway();
  const checklist = useDemoChecklist();
  const balance = useConfidentialAmount(user.confidentialBalance);

  const amount = useAmountInput(
    balance.value === null ? {} : { max: balance.value },
  );

  const action = useWriteAction({
    steps: DEPOSIT_STEPS,
    stageMap: WRITE_STAGE_TO_DEPOSIT_STEP,
    operation: "deposit",
    onSuccess: () => {
      checklist.markComplete("deposit");
      checklist.markComplete("authorize");
      amount.clear();
    },
  });

  const atCapacity = isPoolAtCapacity(pool) && !user.isParticipant;
  const drawSealing = pool.draw.status === "sealing";
  const blocked = atCapacity || drawSealing;

  const submit = () =>
    void action.execute(async (context) => {
      const value = await context.step("validate", () => {
        if (!amount.isValid || amount.value === null) throw productError("insufficient-confidential");
        if (atCapacity) throw productError("participant-limit-reached");
        if (drawSealing) throw productError("draw-in-progress");
        return amount.value;
      });

      if (!user.hasPoolOperatorApproval) {
        const until = new Date(Date.now() + OPERATOR_APPROVAL_DAYS * 86_400_000);
        await context.step("authorize", () => gateway.setPoolOperator(until, {}));
      } else {
        context.skip("authorize");
      }

      return (await gateway.deposit(value, context.tracked)).hash;
    });

  return (
    <ActionCard
      id="deposit"
      title="Deposit privately"
      description="Your amount is encrypted in this browser before it is sent. The pool adds it to an encrypted total it never decrypts."
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Deposit more"
      headerAction={
        user.isParticipant ? (
          <Badge tone="accent">Participating</Badge>
        ) : (
          <Badge tone="neutral">Not yet in the pool</Badge>
        )
      }
    >
      {atCapacity ? (
        <Callout tone="warning" title="This draw is full">
          The encrypted draw scans every participant, so each draw admits {pool.participantCap}{" "}
          wallets. You can join the next one.
        </Callout>
      ) : null}

      {drawSealing ? (
        <Callout tone="info" title="A draw is being sealed">
          Deposits pause while the encrypted scan runs, so that every participant&rsquo;s weight
          stays fixed for the duration of the draw. This takes a few blocks.
        </Callout>
      ) : null}

      <AmountField
        label="Amount to deposit"
        value={amount.text}
        onValueChange={amount.setText}
        symbol={pool.asset.confidential.symbol}
        disabled={action.isBusy || blocked}
        {...(amount.error ? { error: amount.error } : {})}
        {...(balance.value !== null ? { onMax: () => amount.setValue(balance.value ?? 0n) } : {})}
        maxHint={
          balance.value === null ? (
            <button type="button" className={styles.revealLink} onClick={() => void balance.reveal()}>
              Balance encrypted — reveal
            </button>
          ) : undefined
        }
        hint={
          balance.value === null
            ? "Your cUSDT balance is encrypted, so this form cannot check the amount against it. A deposit larger than your balance moves nothing rather than reverting."
            : undefined
        }
      />

      {!user.hasPoolOperatorApproval ? (
        <Callout tone="privacy" title="One-time authorisation">
          Depositing lets the pool move your confidential tokens on your behalf. The
          authorisation is added as the first step below and expires in{" "}
          {OPERATOR_APPROVAL_DAYS} days.
        </Callout>
      ) : null}

      <Button
        onClick={submit}
        loading={action.isBusy}
        disabled={action.isBusy || !amount.isValid || blocked}
        fullWidth
      >
        Encrypt and deposit
      </Button>
    </ActionCard>
  );
}
