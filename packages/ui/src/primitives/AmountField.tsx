import { useId, type ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./AmountField.module.css";

export type AmountFieldProps = {
  readonly label: string;
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  readonly symbol: string;
  /** Shown under the field. Presence of `error` overrides it. */
  readonly hint?: ReactNode;
  readonly error?: string;
  readonly disabled?: boolean;
  /** Renders a "Max" affordance. Omit when there is no known maximum. */
  readonly onMax?: () => void;
  readonly maxHint?: ReactNode;
  readonly autoFocus?: boolean;
};

/**
 * The amount input.
 *
 * `inputMode="decimal"` with a text type rather than `type="number"`: number
 * inputs silently accept exponent notation and scroll-to-change, both of which
 * are hazards when the value is money. Validation lives in the domain layer —
 * this component reports what it is told, and pairs the message with the field
 * through `aria-describedby` so the error is announced on focus.
 */
export function AmountField({
  label,
  value,
  onValueChange,
  symbol,
  hint,
  error,
  disabled = false,
  onMax,
  maxHint,
  autoFocus = false,
}: AmountFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const hasError = error !== undefined;

  return (
    <div className={styles.field}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        {maxHint ? <span className={styles.maxHint}>{maxHint}</span> : null}
      </div>

      <div className={clsx(styles.control, hasError && styles.controlError, disabled && styles.controlDisabled)}>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="0.00"
          value={value}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError || hint ? messageId : undefined}
          onChange={(event) => onValueChange(event.target.value)}
        />
        <span className={styles.symbol}>{symbol}</span>
        {onMax ? (
          <button type="button" className={styles.max} onClick={onMax} disabled={disabled}>
            Max
          </button>
        ) : null}
      </div>

      {hasError ? (
        <p id={messageId} className={styles.error}>
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
