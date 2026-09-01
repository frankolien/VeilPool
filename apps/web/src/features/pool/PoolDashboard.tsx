"use client";

import Link from "next/link";
import { Badge, Card, Mono } from "@veil/ui";
import { ConnectGate } from "@/components/ConnectGate";
import { PageHeading } from "@/components/PageHeading";
import { formatAmount } from "@/domain/money/amount";
import { isEligibleForDraw, type PoolState, type UserState } from "@/domain/pool/types";
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
        title="Your next chance"
        description="Anticipation above. Private savings below."
      />
      <ConnectGate>
        {({ pool, user }) => (
          <div className={styles.layout}>
            <div className={styles.main}>
              <DrawHero pool={pool} user={user} />
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
  const symbol = displaySymbol(pool.asset.confidential.symbol);
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
          hideAction
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
        <div className={styles.principalProofs} aria-label="Principal guarantees">
          <span>100% withdrawable</span>
          <span>Never prize liquidity</span>
        </div>
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
            hideAction
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
            hideAction
          />
          <p className={styles.summaryFoot}>Held outside the pool, ready to deposit</p>
        </Card>

        <Card padding="md" className={styles.privacyCard}>
          <p className={styles.summaryLabel}>Participation privacy</p>
          <strong>{pool.participantCount} eligible wallet{pool.participantCount === 1 ? "" : "s"}</strong>
          <p className={styles.summaryFoot}>
            {pool.participantCount === 1
              ? "You are currently the only eligible wallet. Your amount remains encrypted, but participation is public."
              : "Wallet participation is public. Every individual balance and draw weight remains encrypted."}
          </p>
        </Card>
      </div>
    </div>
  );
}

function DrawHero({ pool, user }: { readonly pool: PoolState; readonly user: UserState }) {
  const symbol = displaySymbol(pool.asset.confidential.symbol);
  const eligible = isEligibleForDraw(user, pool.draw);
  const state = drawStateLabel(pool.draw.status);
  return (
    <section className={styles.drawHero} aria-label={`Draw ${pool.draw.id}`}>
      <div>
        <p className={styles.eyebrow}>Draw #{pool.draw.id} · {state}</p>
        <h2>{formatAmount(pool.draw.prize)} <span>{symbol}</span></h2>
        <p className={styles.heroCopy}>{eligible ? "Your encrypted savings are in this draw." : "Deposit now to enter the next eligible draw."}</p>
      </div>
      <div className={styles.heroClock}>
        <span>{pool.draw.status === "open" ? "Draw seals in" : state}</span>
        {pool.draw.status === "open" ? (
          <Countdown deadline={pool.draw.closesAt} size="xl" />
        ) : (
          <Mono size="lg">{pool.draw.status === "ready" ? "READY" : pool.draw.status === "awarded" ? "DONE" : "LIVE"}</Mono>
        )}
        {pool.draw.status === "ready" ? (
          <Link href="/draws" className={styles.drawCta}>Run encrypted draw <span aria-hidden="true">↗</span></Link>
        ) : null}
      </div>
      <div className={styles.heroMeta}>
        <span>{pool.participantCount} / {pool.participantCap} wallets</span>
        <span>Sepolia test draw</span>
      </div>
    </section>
  );
}

function displaySymbol(symbol: string): string {
  return symbol.replace(/mock/i, "");
}

function drawStateLabel(status: PoolState["draw"]["status"]): string {
  switch (status) {
    case "open": return "Entries open";
    case "ready": return "Ready to draw";
    case "sealing": return "Encrypted draw running";
    case "awarded": return "Settled";
  }
}
