"use client";

import { AmountField, Button, Callout } from "@veil/ui";
import { ActionCard } from "@/components/ActionCard";
import { OPERATOR_APPROVAL_DAYS } from "@/config/product";
import { productError } from "@/domain/errors/taxonomy";
import type { PoolState, UserState } from "@/domain/pool/types";
import { PRIZE_FUNDING_STEPS, WRITE_STAGE_TO_PRIZE_FUNDING_STEP } from "@/domain/transactions/flows";
import { useConfidentialAmount } from "@/features/decrypt/useConfidentialAmount";
import { useAmountInput } from "@/features/transactions/useAmountInput";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import styles from "./PrizeReserveCard.module.css";

export function PrizeReserveCard({ pool, user }: { readonly pool: PoolState; readonly user: UserState }) {
  const gateway = useGateway();
  const balance = useConfidentialAmount(user.confidentialBalance);
  const amount = useAmountInput(balance.value === null ? {} : { max: balance.value });
  const action = useWriteAction({
    steps: PRIZE_FUNDING_STEPS,
    stageMap: WRITE_STAGE_TO_PRIZE_FUNDING_STEP,
    operation: "fund-prize",
    onSuccess: amount.clear,
  });

  const submit = () => void action.execute(async (context) => {
    const value = await context.step("validate", () => {
      if (!amount.isValid || amount.value === null) throw productError("insufficient-confidential");
      return amount.value;
    });

    if (!user.hasPoolOperatorApproval) {
      const until = new Date(Date.now() + OPERATOR_APPROVAL_DAYS * 86_400_000);
      await context.step("authorize", () => gateway.setPoolOperator(until, {}));
    } else {
      context.skip("authorize");
    }

    return (await gateway.fundPrizeReserve(value, context.tracked)).hash;
  });

  return (
    <ActionCard
      title="Fund the encrypted prize reserve"
      description="Contribute confidential cUSDT to the prize-only ledger. It can fund draws, but can never be counted as anyone's principal."
      steps={action.steps}
      isBusy={action.isBusy}
      isComplete={action.isComplete}
      error={action.error}
      receipt={action.receipt}
      hash={action.hash}
      onReset={action.reset}
      completionLabel="Fund another draw"
    >
      <Callout tone="privacy" title="The reserve amount stays private">
        Funding is visible as a contract interaction. The contribution and resulting reserve are encrypted, so this page does not publish a reserve balance.
      </Callout>
      <AmountField
        label="Prize contribution"
        value={amount.text}
        onValueChange={amount.setText}
        symbol={pool.asset.confidential.symbol}
        disabled={action.isBusy}
        {...(amount.error ? { error: amount.error } : {})}
        {...(balance.value !== null ? { onMax: () => amount.setValue(balance.value ?? 0n) } : {})}
        maxHint={balance.value === null ? (
          <button type="button" className={styles.revealLink} onClick={() => void balance.reveal()}>
            Balance encrypted — reveal
          </button>
        ) : undefined}
        hint={balance.value === null ? "Reveal your cUSDT balance to validate the contribution before signing." : undefined}
      />
      {!user.hasPoolOperatorApproval ? (
        <Callout tone="info" title="Pool authorisation required">
          The first transaction gives the pool time-limited permission to move the encrypted contribution.
        </Callout>
      ) : null}
      <Button fullWidth onClick={submit} loading={action.isBusy} disabled={action.isBusy || !amount.isValid}>
        Encrypt and fund reserve
      </Button>
    </ActionCard>
  );
}
