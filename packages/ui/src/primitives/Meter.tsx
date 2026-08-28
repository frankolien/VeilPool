import { clsx } from "../utils/clsx";
import styles from "./Meter.module.css";

export type MeterProps = {
  /** 0 to 1. Values outside the range are clamped rather than overflowing. */
  readonly ratio: number;
  readonly label: string;
  /** Human-readable current value, e.g. "412 of 1,000 USDT". */
  readonly valueText: string;
  readonly tone?: "accent" | "prize";
};

/** A linear progress meter with a real `meter` role and a text value. */
export function Meter({ ratio, label, valueText, tone = "accent" }: MeterProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return (
    <div
      className={styles.track}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
    >
      <div
        className={clsx(styles.fill, styles[tone])}
        style={{ inlineSize: `${clamped * 100}%` }}
      />
    </div>
  );
}

export type ProgressRingProps = {
  readonly ratio: number;
  readonly label: string;
  readonly valueText: string;
  readonly size?: number;
};

/**
 * The savings-goal ring.
 *
 * Rendered only from a value the user has already decrypted locally — the app
 * cannot compute progress against a sealed balance, and must not imply it can.
 */
export function ProgressRing({ ratio, label, valueText, size = 88 }: ProgressRingProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={styles.ring}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--veil-border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--veil-accent)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={styles.ringFill}
      />
    </svg>
  );
}
