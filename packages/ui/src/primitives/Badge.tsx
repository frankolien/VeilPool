import type { ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "accent" | "prize" | "success" | "danger" | "warning";

export type BadgeProps = {
  readonly tone?: BadgeTone;
  readonly children: ReactNode;
  /**
   * A shape shown alongside the colour.
   *
   * Status is never conveyed by colour alone: each tone pairs with a distinct
   * glyph so the badge survives greyscale and colour-vision differences.
   */
  readonly glyph?: string;
};

const DEFAULT_GLYPHS: Readonly<Record<BadgeTone, string>> = {
  neutral: "",
  accent: "◆",
  prize: "★",
  success: "✓",
  danger: "✕",
  warning: "!",
};

export function Badge({ tone = "neutral", children, glyph }: BadgeProps) {
  const mark = glyph ?? DEFAULT_GLYPHS[tone];
  return (
    <span className={clsx(styles.badge, styles[tone])}>
      {mark ? (
        <span className={styles.glyph} aria-hidden="true">
          {mark}
        </span>
      ) : null}
      {children}
    </span>
  );
}
