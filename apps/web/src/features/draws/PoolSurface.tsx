"use client";

import { useMemo } from "react";
import { clsx } from "@veil/ui";
import styles from "./PoolSurface.module.css";

/**
 * The pool, drawn.
 *
 * One droplet per participant, identical in size regardless of deposit. That is
 * the whole idea rendered as a picture: the pool's activity is public, the
 * composition is not. Sizing droplets by weight would leak exactly what the
 * protocol spends its gas hiding, so the visual has to stay flat even though a
 * weighted version would look better.
 *
 * During a draw a pulse crosses the surface. It highlights nobody — no droplet
 * is marked as the winner, because the contract does not emit one.
 */
export function PoolSurface({
  participantCount,
  pulsing,
  capacity,
}: {
  readonly participantCount: number;
  readonly pulsing: boolean;
  readonly capacity: number;
}) {
  // Positions are derived from the index so the surface is stable across
  // renders. A field that reshuffles on every poll reads as instability.
  const droplets = useMemo(
    () =>
      Array.from({ length: Math.min(participantCount, capacity) }, (_, index) => ({
        id: index,
        left: 6 + ((index * 37) % 88),
        top: 18 + ((index * 53) % 64),
        delay: (index % 7) * 0.45,
      })),
    [participantCount, capacity],
  );

  return (
    <div
      className={clsx(styles.surface, pulsing && styles.pulsing)}
      role="img"
      aria-label={
        pulsing
          ? `A draw is running across ${participantCount} encrypted deposits`
          : `${participantCount} encrypted deposits in the pool`
      }
    >
      <div className={styles.water} aria-hidden="true" />
      {droplets.map((droplet) => (
        <span
          key={droplet.id}
          className={styles.droplet}
          style={{
            insetInlineStart: `${droplet.left}%`,
            insetBlockStart: `${droplet.top}%`,
            animationDelay: `${droplet.delay}s`,
          }}
          aria-hidden="true"
        />
      ))}
      {pulsing ? <span className={styles.pulse} aria-hidden="true" /> : null}
      <div className={styles.caption} aria-hidden="true">
        Every droplet is one participant. None shows an amount.
      </div>
    </div>
  );
}
