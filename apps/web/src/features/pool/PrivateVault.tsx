"use client";

import { Badge, Callout, Card, CardHeader, Mono } from "@veil/ui";
import { basisPoints, formatAmount, formatPercent } from "@/domain/money/amount";
import { isEligibleForDraw, type PoolState, type UserState } from "@/domain/pool/types";
import { INFERENCE_RISKS } from "@/domain/privacy/disclosure";
import { ConfidentialAmount } from "@/features/decrypt/ConfidentialAmount";
import { RevealBar } from "@/features/decrypt/RevealBar";
import { useRevealedValue } from "@/features/decrypt/useConfidentialAmount";
import { ClaimCard } from "@/features/claim/ClaimCard";
import { SavingsGoal } from "./SavingsGoal";
import styles from "./PrivateVault.module.css";

/**
 * The private vault.
 *
 * Everything the user alone can see, in one place. Derived figures — savings
 * progress, an odds estimate — are computed from values already decrypted
 * locally, and are simply absent until then. Estimating them from public data
 * would be inventing a number about someone's finances.
 */
export function PrivateVault({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const principal = useRevealedValue(user.principal);
  const symbol = pool.asset.confidential.symbol;
  const eligible = isEligibleForDraw(user, pool.draw);

  return (
    <div className={styles.vault}>
      <RevealBar user={user} />

      <div className={styles.grid}>
        <Card padding="lg" tone="accent" className={styles.principal}>
          <p className={styles.label}>Principal</p>
          <ConfidentialAmount
            source={user.principal}
            label="your principal"
            symbol={symbol}
            size="xl"
            emptyLabel="No deposit yet"
          />
          <div className={styles.eligibility}>
            {!user.isParticipant ? (
              <Badge tone="neutral">Not in the pool</Badge>
            ) : eligible ? (
              <Badge tone="accent">Eligible for draw #{pool.draw.id}</Badge>
            ) : (
              <Badge tone="neutral">Eligible from draw #{user.eligibleFromDrawId}</Badge>
            )}
          </div>
        </Card>

        <SavingsGoal principal={principal} symbol={symbol} />
      </div>

      <ClaimCard pool={pool} user={user} />

      <Card padding="md">
        <CardHeader
          title="Your odds"
          description="Estimated from figures you have decrypted locally. The pool's total is encrypted, so this is an estimate and the protocol never computes it."
        />
        <OddsEstimate
          principal={principal}
          participantCount={pool.draw.participantCount}
          eligible={eligible}
        />
      </Card>

      <Card padding="md">
        <CardHeader
          title="Your draw results"
          description="A result is a change in your encrypted winnings. Reveal it above — this page cannot read it, and never infers a winner from claim activity."
        />
        <p className={styles.resultLine}>
          {user.unclaimedWinnings.status === "unavailable"
            ? "You have no position in a settled draw yet."
            : "Your unclaimed winnings reflect every draw you have won and not yet claimed."}
        </p>
      </Card>

      <Callout tone="warning" title="What could still give you away">
        <ul className={styles.risks}>
          {INFERENCE_RISKS.map((risk) => (
            <li key={risk.id}>
              <strong>{risk.label}.</strong> {risk.because}
            </li>
          ))}
        </ul>
      </Callout>
    </div>
  );
}

/**
 * A local odds estimate.
 *
 * Uses an equal-share assumption across eligible participants, and says so.
 * The honest alternative to a precise number the app cannot compute is a
 * labelled estimate, not a confident-looking one.
 */
function OddsEstimate({
  principal,
  participantCount,
  eligible,
}: {
  readonly principal: bigint | null;
  readonly participantCount: number;
  readonly eligible: boolean;
}) {
  if (!eligible || principal === null || principal === 0n) {
    return (
      <p className={styles.oddsEmpty}>
        {!eligible
          ? "You are not eligible for the current draw."
          : "Reveal your principal to see an estimate."}
      </p>
    );
  }

  if (participantCount === 0) {
    return <p className={styles.oddsEmpty}>No eligible participants yet.</p>;
  }

  const evenShare = basisPoints(1n, BigInt(participantCount));

  return (
    <div className={styles.odds}>
      <div>
        <Mono size="lg">{evenShare === null ? "—" : formatPercent(evenShare)}</Mono>
        <p className={styles.oddsNote}>
          if every one of the {participantCount} participants held an equal deposit
        </p>
      </div>
      <p className={styles.oddsDetail}>
        Your real odds are your {formatAmount(principal)} divided by the pool&rsquo;s total, and the
        total is encrypted. Deposit more than the average and your odds are higher than this
        figure; deposit less and they are lower.
      </p>
    </div>
  );
}
