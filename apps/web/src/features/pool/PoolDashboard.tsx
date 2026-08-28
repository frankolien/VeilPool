"use client";

import { Badge, Card, Mono } from "@veil/ui";
import { ConnectGate } from "@/components/ConnectGate";
import { PageHeading } from "@/components/PageHeading";
import { formatAmount } from "@/domain/money/amount";
import { isEligibleForDraw, isPoolAtCapacity, type PoolState, type UserState } from "@/domain/pool/types";
import { ConfidentialAmount } from "@/features/decrypt/ConfidentialAmount";
import { RevealBar } from "@/features/decrypt/RevealBar";
import { DemoChecklistPanel } from "@/features/onboarding/DemoChecklistPanel";
import { FaucetCard } from "@/features/faucet/FaucetCard";
import { ShieldCard } from "@/features/shield/ShieldCard";
import { DepositCard } from "@/features/deposit/DepositCard";
import { WithdrawCard } from "@/features/withdraw/WithdrawCard";
import { Countdown } from "@/features/draws/Countdown";
import styles from "./PoolDashboard.module.css";

/**
 * The pool dashboard.
 *
 * Ordered by what a user actually does, top to bottom: see where you stand, then
 * get tokens, shield, deposit, withdraw. The walkthrough panel sits alongside so
 * that the next action is visible without scrolling to find it.
 */
export function PoolDashboard() {
  return (
    <>
      <PageHeading
        title="Private savings"
        description="Your encrypted position, prize eligibility and available actions in one place."
      />
      <ConnectGate>
        {({ pool, user }) => (
          <div className={styles.layout}>
            <div className={styles.main}>
              <PositionSummary pool={pool} user={user} />
              <RevealBar user={user} />
              <FaucetCard pool={pool} user={user} />
              <ShieldCard pool={pool} user={user} />
              <DepositCard pool={pool} user={user} />
              <WithdrawCard pool={pool} user={user} />
            </div>
            <aside className={styles.aside}>
              <DemoChecklistPanel pool={pool} user={user} />
            </aside>
          </div>
        )}
      </ConnectGate>
    </>
  );
}

function PositionSummary({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const symbol = pool.asset.confidential.symbol;
  const full = isPoolAtCapacity(pool) && !user.isParticipant;

  return (
    <div className={styles.summary}>
      <Card tone="accent" padding="lg" className={styles.principalCard}>
        <p className={styles.summaryLabel}>Protected principal</p>
        <ConfidentialAmount
          source={user.principal}
          label="your principal"
          symbol={symbol}
          size="xl"
          emptyLabel="No deposit yet"
        />
        <div className={styles.eligibility}>
          {!user.isParticipant ? (
            <Badge tone="neutral">Not in the pool yet</Badge>
          ) : isEligibleForDraw(user, pool.draw) ? (
            <Badge tone="accent">In draw #{pool.draw.id}</Badge>
          ) : (
            <Badge tone="neutral">From draw #{user.eligibleFromDrawId}</Badge>
          )}
        </div>

        <p className={styles.summaryNote}>
          Encrypted onchain and withdrawable in full. A draw can never reduce this balance.
        </p>
      </Card>

      <div className={styles.summarySide}>
        <Card padding="md">
          <p className={styles.summaryLabel}>Unclaimed winnings</p>
          <ConfidentialAmount
            source={user.unclaimedWinnings}
            label="your unclaimed winnings"
            symbol={symbol}
            size="md"
            emptyLabel="Nothing yet"
          />
        </Card>

        <Card padding="md">
          <p className={styles.summaryLabel}>Confidential balance</p>
          <ConfidentialAmount
            source={user.confidentialBalance}
            label="your confidential balance"
            symbol={symbol}
            size="md"
            emptyLabel="None held"
          />
          <p className={styles.summaryFoot}>Held outside the pool, ready to deposit</p>
        </Card>

        <Card padding="md">
          <p className={styles.summaryLabel}>Next draw</p>
          <div className={styles.drawRow}>
            {pool.draw.status === "open" ? (
              <Countdown deadline={pool.draw.closesAt} size="md" />
            ) : (
              <Badge tone="prize">{pool.draw.status === "awarded" ? "Settled" : "Running"}</Badge>
            )}
            <Mono size="sm" className={styles.prizeText}>
              {formatAmount(pool.draw.prize)} {symbol}
            </Mono>
          </div>
          <p className={styles.summaryFoot}>
            {full
              ? `Pool is full at ${pool.participantCap} wallets`
              : `${pool.participantCount} of ${pool.participantCap} wallets`}
          </p>
        </Card>
      </div>
    </div>
  );
}
