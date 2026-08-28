import { clsx } from "../utils/clsx";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  readonly width?: string;
  readonly height?: string;
  readonly className?: string;
};

/**
 * A loading placeholder.
 *
 * Marked `aria-hidden` and paired with a `VisuallyHidden` "Loading" by the
 * caller, so assistive technology hears one loading announcement instead of one
 * per placeholder block.
 */
export function Skeleton({ width = "100%", height = "1rem", className }: SkeletonProps) {
  return (
    <span
      className={clsx(styles.skeleton, className)}
      style={{ inlineSize: width, blockSize: height }}
      aria-hidden="true"
    />
  );
}
