"use client";

import { useEffect, useState } from "react";
import { Mono, VisuallyHidden } from "@veil/ui";

/**
 * Time until a draw is sealable.
 *
 * Ticks locally against a chain-supplied deadline rather than polling for it.
 * The spoken form is separated from the digits: "01:12" is read out
 * character-by-character by most screen readers, which is useless.
 */
export function Countdown({
  deadline,
  size = "lg",
}: {
  readonly deadline: number;
  readonly size?: "md" | "lg" | "xl";
}) {
  const [remaining, setRemaining] = useState(() => secondsLeft(deadline));

  useEffect(() => {
    setRemaining(secondsLeft(deadline));
    const timer = setInterval(() => setRemaining(secondsLeft(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <span>
      <Mono size={size} aria-hidden="true">
        {formatClock(remaining)}
      </Mono>
      <VisuallyHidden>{spokenDuration(remaining)}</VisuallyHidden>
    </span>
  );
}

function secondsLeft(deadline: number): number {
  return Math.max(0, deadline - Math.floor(Date.now() / 1000));
}

function formatClock(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function spokenDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return "Ready now";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [
    hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"}` : null,
    minutes > 0 ? `${minutes} minute${minutes === 1 ? "" : "s"}` : null,
    hours === 0 && seconds > 0 ? `${seconds} second${seconds === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return `${parts.join(" ")} remaining`;
}
