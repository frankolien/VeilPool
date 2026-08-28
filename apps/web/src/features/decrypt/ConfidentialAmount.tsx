"use client";

import { Button, SealedValue } from "@veil/ui";
import { formatAmount } from "@/domain/money/amount";
import type { ConfidentialValue } from "@/domain/privacy/confidential";
import { useConfidentialAmount } from "./useConfidentialAmount";

export type ConfidentialAmountProps = {
  readonly source: ConfidentialValue;
  readonly label: string;
  readonly symbol: string;
  readonly size?: "md" | "lg" | "xl";
  readonly emptyLabel?: string;
  /** Hides the inline reveal control where a screen offers a single shared one. */
  readonly hideAction?: boolean;
};

/**
 * A confidential figure with its reveal control.
 *
 * The control is always an explicit button. Revealing costs a wallet signature,
 * and a signature prompt the user did not ask for reads — correctly — as an
 * attempt to move money.
 */
export function ConfidentialAmount({
  source,
  label,
  symbol,
  size = "lg",
  emptyLabel,
  hideAction = false,
}: ConfidentialAmountProps) {
  const view = useConfidentialAmount(source);

  const action =
    hideAction || !view.canReveal ? undefined : (
      <Button variant="ghost" size="sm" onClick={() => void view.reveal()}>
        Reveal
      </Button>
    );

  return (
    <SealedValue
      state={view.state}
      label={label}
      size={size}
      {...(view.value !== null ? { value: `${formatAmount(view.value)} ${symbol}` } : {})}
      {...(view.handlePreview ? { handlePreview: view.handlePreview } : {})}
      {...(emptyLabel ? { emptyLabel } : {})}
      {...(action ? { action } : {})}
    />
  );
}
