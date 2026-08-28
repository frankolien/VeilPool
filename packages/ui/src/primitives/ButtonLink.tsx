import type { AnchorHTMLAttributes, ReactNode } from "react";
import { clsx } from "../utils/clsx";
import buttonStyles from "./Button.module.css";

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  readonly variant?: "primary" | "secondary" | "ghost" | "prize";
  readonly size?: "sm" | "md" | "lg";
  readonly children: ReactNode;
};

/**
 * A link that looks like a button.
 *
 * Navigation is an anchor, not a button with an onClick. Styling them alike is a
 * visual decision; making them the same element is an accessibility bug — it
 * costs middle-click, open-in-new-tab, and the correct role.
 *
 * Shares `Button`'s stylesheet so the two can never drift apart.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      className={clsx(
        buttonStyles.button,
        buttonStyles[variant],
        buttonStyles[size],
        className,
      )}
      style={{ textDecoration: "none" }}
      {...rest}
    >
      <span className={buttonStyles.label}>{children}</span>
    </a>
  );
}
