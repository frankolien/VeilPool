import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "../utils/clsx";
import styles from "./Card.module.css";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  readonly tone?: "default" | "accent" | "prize";
  readonly padding?: "sm" | "md" | "lg";
};

export function Card({ tone = "default", padding = "md", className, children, ...rest }: CardProps) {
  return (
    <div className={clsx(styles.card, styles[tone], styles[`pad-${padding}`], className)} {...rest}>
      {children}
    </div>
  );
}

export type CardHeaderProps = {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
};

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
      {action ? <div className={styles.headerAction}>{action}</div> : null}
    </div>
  );
}
