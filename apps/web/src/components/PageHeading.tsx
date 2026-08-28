import type { ReactNode } from "react";
import styles from "./PageHeading.module.css";

export function PageHeading({
  title,
  description,
}: {
  readonly title: string;
  readonly description?: ReactNode;
}) {
  return (
    <header className={styles.heading}>
      <h1 className={styles.title}>{title}</h1>
      {description ? <p className={styles.description}>{description}</p> : null}
    </header>
  );
}
