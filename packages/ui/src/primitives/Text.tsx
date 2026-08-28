import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./Text.module.css";

/** Content for assistive technology only. */
export function VisuallyHidden({ children }: { readonly children: ReactNode }) {
  return <span className={styles.visuallyHidden}>{children}</span>;
}

export type MonoProps = HTMLAttributes<HTMLSpanElement> & {
  readonly size?: "sm" | "md" | "lg" | "xl";
};

/** Tabular monospace, for any figure the user might compare or read aloud. */
export function Mono({ size = "md", className, children, ...rest }: MonoProps) {
  return (
    <span className={clsx(styles.mono, styles[size], className)} {...rest}>
      {children}
    </span>
  );
}

export type EyebrowProps = { readonly children: ReactNode; readonly tone?: "muted" | "accent" };

export function Eyebrow({ children, tone = "muted" }: EyebrowProps) {
  return <span className={clsx(styles.eyebrow, styles[tone])}>{children}</span>;
}
