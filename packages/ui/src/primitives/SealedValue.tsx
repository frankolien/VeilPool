import type { ReactNode } from "react";
import { clsx } from "../utils/clsx";
import { VisuallyHidden } from "./Text";
import styles from "./SealedValue.module.css";

export type SealedValueState = "unavailable" | "sealed" | "revealing" | "revealed";

export type SealedValueProps = {
  readonly state: SealedValueState;
  /** Rendered only when `state === "revealed"`. */
  readonly value?: ReactNode;
  /** What this figure is, for the accessible name: "your principal". */
  readonly label: string;
  /** First bytes of the ciphertext handle. Real, and verifiable on-chain. */
  readonly handlePreview?: string;
  readonly size?: "md" | "lg" | "xl";
  readonly emptyLabel?: string;
  readonly action?: ReactNode;
};

/**
 * A confidential figure.
 *
 * Sealed values are shown as a fixed-width cipher block rather than dots or a
 * blur. Dots read as a password field and blur reads as a paywall; a block of
 * hex reads as what it is — a ciphertext that exists on-chain and that only this
 * user can open. The handle preview is shown for the same reason: it is real,
 * and a reader can check it against the contract.
 *
 * The masked state is announced to screen readers as "hidden", never as a value,
 * so assistive technology is never told a number the visual UI is withholding.
 */
export function SealedValue({
  state,
  value,
  label,
  handlePreview,
  size = "lg",
  emptyLabel = "No position yet",
  action,
}: SealedValueProps) {
  if (state === "unavailable") {
    return (
      <div className={clsx(styles.root, styles[size])}>
        <span className={styles.empty}>{emptyLabel}</span>
      </div>
    );
  }

  if (state === "revealed") {
    return (
      <div className={clsx(styles.root, styles[size])}>
        <span className={styles.revealed}>
          <VisuallyHidden>{label}, revealed: </VisuallyHidden>
          {value}
        </span>
        {action}
      </div>
    );
  }

  const revealing = state === "revealing";
  return (
    <div className={clsx(styles.root, styles[size])}>
      <span
        className={clsx(styles.cipher, revealing && styles.revealingCipher)}
        aria-hidden="true"
      >
        {CIPHER_BLOCK}
      </span>
      <VisuallyHidden>
        {label} is {revealing ? "being revealed" : "hidden"}. Encrypted on-chain.
      </VisuallyHidden>
      {handlePreview ? (
        <span className={styles.handle} title="On-chain ciphertext handle">
          {handlePreview}
        </span>
      ) : null}
      {action}
    </div>
  );
}

/**
 * A fixed glyph run rather than randomised characters: randomising every render
 * makes the figure twitch on unrelated state changes, which reads as instability
 * in a product asking to be trusted with savings.
 */
const CIPHER_BLOCK = "a7f2·9c04·e1b8";
