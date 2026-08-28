"use client";

import { useCallback, useMemo, useState } from "react";
import { MAX_TOKEN_AMOUNT, TOKEN_DECIMALS, formatAmount, parseAmount } from "@/domain/money/amount";
import type { ParseFailure } from "@/domain/money/amount";

/**
 * An amount field's state.
 *
 * Validation messages are produced here so that "too many decimal places" reads
 * the same in every form. The field reports a problem only once the user has
 * typed something — validating an untouched field is scolding.
 */
export type AmountInput = {
  readonly text: string;
  readonly value: bigint | null;
  readonly error: string | undefined;
  readonly isValid: boolean;
  readonly setText: (next: string) => void;
  readonly setValue: (next: bigint) => void;
  readonly clear: () => void;
};

export type AmountInputOptions = {
  /**
   * A known ceiling, when there is one.
   *
   * Confidential balances are encrypted, so most forms have no ceiling to check
   * against — the protocol resolves an over-large transfer to zero instead of
   * reverting. Passing `null` means "unknown", not "unlimited", and the form is
   * expected to say so.
   */
  readonly max?: bigint | null;
  readonly maxMessage?: string;
};

const FAILURE_MESSAGES: Readonly<Record<ParseFailure, string>> = {
  empty: "Enter an amount",
  "not-a-number": "Use digits and a single decimal point",
  negative: "Enter a positive amount",
  "too-many-decimals": `This token supports ${TOKEN_DECIMALS} decimal places`,
  "exceeds-max": "That amount is larger than the protocol can represent",
};

export function useAmountInput(options: AmountInputOptions = {}): AmountInput {
  const { max = null, maxMessage } = options;
  const [text, setText] = useState("");

  const parsed = useMemo(() => parseAmount(text), [text]);

  const error = useMemo(() => {
    if (text.trim() === "") return undefined;
    if (!parsed.ok) return FAILURE_MESSAGES[parsed.reason];
    if (parsed.value === 0n) return "Enter an amount above zero";
    if (max !== null && parsed.value > max) {
      return maxMessage ?? `You have ${formatAmount(max)} available`;
    }
    return undefined;
  }, [text, parsed, max, maxMessage]);

  return {
    text,
    value: parsed.ok && parsed.value > 0n ? parsed.value : null,
    error,
    isValid: error === undefined && parsed.ok && parsed.value > 0n && parsed.value <= MAX_TOKEN_AMOUNT,
    setText,
    setValue: useCallback((next: bigint) => setText(formatAmount(next, { grouped: false })), []),
    clear: useCallback(() => setText(""), []),
  };
}
