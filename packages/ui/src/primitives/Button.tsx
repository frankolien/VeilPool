import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "prize";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly leadingIcon?: ReactNode;
};

/**
 * A button.
 *
 * `loading` keeps the button focusable and announces busy state rather than
 * disabling it: a control that vanishes from the tab order mid-flow strands
 * keyboard users at the exact moment they are waiting for a transaction.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leadingIcon,
  disabled,
  children,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className,
      )}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leadingIcon}
      <span className={styles.label}>{children}</span>
    </button>
  );
}
