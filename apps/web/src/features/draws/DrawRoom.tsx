"use client";

import { Badge, Button, Callout, Card, Meter, Mono } from "@veil/ui";
import { formatAmount } from "@/domain/money/amount";
import { progressRatio, type DrawStatus } from "@/domain/draw/types";
import { isPrizeFunded, type PoolState, type UserState } from "@/domain/pool/types";
import { DRAW_STEPS, WRITE_STAGE_TO_DRAW_STEP } from "@/domain/transactions/flows";
import { transactionUrl } from "@/config/environment";
import { useGateway } from "@/infrastructure/gateway/GatewayProvider";
import { useWriteAction } from "@/features/transactions/useWriteAction";
import { useDemoChecklist } from "@/features/onboarding/DemoChecklistProvider";
import { ErrorNotice } from "@/components/ErrorNotice";
import { TransactionProgress } from "@/components/TransactionProgress";
import { PoolSurface } from "./PoolSurface";
import { Countdown } from "./Countdown";
import styles from "./DrawRoom.module.css";
import { PrizeReserveCard } from "./PrizeReserveCard";

const STATUS_COPY: Readonly<Record<DrawStatus, { badge: string; tone: "neutral" | "accent" | "prize" | "success"; line: string }>> = {
  open: {
    badge: "Open",
    tone: "neutral",
    line: "Deposits are being accepted. The draw can be sealed when the countdown reaches zero.",
  },
  ready: {
    badge: "Ready to seal",
    tone: "accent",
    line: "Anyone can seal this draw. Sealing generates encrypted randomness on-chain.",
  },
  sealing: {
    badge: "Selecting",
    tone: "prize",
    line: "The contract is walking every participant under encryption. No winner is emitted.",
  },
  awarded: {
    badge: "Settled",
    tone: "success",
    line: "A winner was selected and credited under encryption. Only they can see it.",
  },
};

/**
 * The draw room.
 *
 * Built to be the memorable screen without becoming a slot machine. What makes
 * it memorable is the absence of the thing every other prize product shows: no
 * winner is announced, because none is emitted. The anticipation comes from the
 * countdown and the scan, and it resolves privately, in the user's own vault.
 */
export function DrawRoom({
  pool,
  user,
}: {
  readonly pool: PoolState;
  readonly user: UserState;
}) {
  const gateway = useGateway();
  const checklist = useDemoChecklist();
  const { draw } = pool;
  const status = STATUS_COPY[draw.status];

  const action = useWriteAction({
    steps: DRAW_STEPS,
    stageMap: WRITE_STAGE_TO_DRAW_STEP,
    operation: "seal-draw",
    onSuccess: () => checklist.markComplete("draw"),
  });

  const funded = isPrizeFunded(pool);
  const canSeal = (draw.status === "ready" || draw.status === "sealing") && funded && !action.isBusy;
  const scanRatio = progressRatio(draw);

  return (
    <div className={styles.room}>
      <Card tone="prize" padding="lg" className={styles.stage}>
        <div className={styles.stageHead}>
          <div>
            <p className={styles.drawLabel}>Draw #{draw.id}</p>
            <Badge tone={status.tone}>{status.badge}</Badge>
          </div>
          <div className={styles.countdown}>
            {draw.status === "open" ? (
              <>
                <p className={styles.countdownLabel}>Seals in</p>
                <Countdown deadline={draw.closesAt} size="xl" />
              </>
            ) : (
              <>
                <p className={styles.countdownLabel}>Prize</p>
                <Mono size="xl" className={styles.prize}>
                  {formatAmount(draw.prize)}
                </Mono>
              </>
            )}
          </div>
        </div>

        <PoolSurface
          participantCount={draw.participantCount}
          capacity={pool.participantCap}
          pulsing={draw.status === "sealing" || action.isBusy}
        />

        <p className={styles.statusLine}>{status.line}</p>

        {draw.status === "sealing" && scanRatio !== null && draw.progress ? (
          <div className={styles.scan}>
            <Meter
              ratio={scanRatio}
              tone="prize"
              label="Encrypted scan progress"
              valueText={`${draw.progress.processed} of ${draw.progress.total} participants scanned`}
            />
            <p className={styles.scanText}>
              {draw.progress.processed} of {draw.progress.total} participants scanned under
              encryption
            </p>
          </div>
        ) : null}

        <div className={styles.actions}>
          {pool.prizeReserveVisibility === "encrypted" ? (
            <Callout tone="privacy" title="Reserve coverage is confidential">
              The contract checks the encrypted reserve during sealing. If it cannot cover this draw, it awards encrypted zero and principal remains untouched. Fund at least one prize before sealing a fresh deployment.
            </Callout>
          ) : null}
          {!funded ? (
            <Callout tone="warning" title="Prize reserve is short">
              The reserve holds {formatAmount(pool.prizeReserve)} and this draw pays{" "}
              {formatAmount(draw.prize)}. The draw will not run until it is funded. Principal is
              unaffected.
            </Callout>
          ) : (
            <Button
              variant="prize"
              size="lg"
              onClick={() =>
                void action.execute(async (context) => (await gateway.sealDraw(context.tracked)).hash)
              }
              loading={action.isBusy}
              disabled={!canSeal}
            >
              {draw.status === "open"
                ? "Waiting for the countdown"
                : draw.status === "awarded"
                  ? "Draw settled"
                  : "Seal this draw"}
            </Button>
          )}

          {draw.sealTransaction ? (
            <a
              className={styles.verify}
              href={transactionUrl(draw.sealTransaction)}
              target="_blank"
              rel="noreferrer noopener"
            >
              Verify the draw on Etherscan ↗
            </a>
          ) : null}
        </div>

        <TransactionProgress
          steps={action.steps}
          visible={action.isBusy || action.error !== null}
          label="Draw progress"
        />
        {action.error ? <ErrorNotice error={action.error} onRetry={action.reset} /> : null}
      </Card>

      <PrizeReserveCard pool={pool} user={user} />

      <div className={styles.facts}>
        <Fact label="Prize this draw" value={`${formatAmount(draw.prize)} ${pool.asset.confidential.symbol}`} />
        <Fact
          label="Participants"
          value={`${draw.participantCount} of ${pool.participantCap}`}
          note="Public — the encrypted scan has to enumerate them"
        />
        <Fact
          label="Prize reserve"
          value={pool.prizeReserveVisibility === "encrypted" ? "Encrypted" : `${formatAmount(pool.prizeReserve)} ${pool.asset.confidential.symbol}`}
          note={pool.isDemoReserve ? "Funded for the Sepolia demo. Not yield." : undefined}
        />
        <Fact
          label="Your eligibility"
          value={
            !user.isParticipant
              ? "Not in the pool"
              : user.eligibleFromDrawId <= draw.id
                ? "Eligible"
                : `From draw #${user.eligibleFromDrawId}`
          }
          note={
            user.isParticipant && user.eligibleFromDrawId > draw.id
              ? "Deposits join the next draw so weights stay fixed during a scan"
              : undefined
          }
        />
      </div>

      <Callout tone="privacy" title="How a winner is chosen">
        The contract generates encrypted randomness on-chain, reduces it into the pool&rsquo;s
        encrypted total, and walks every participant comparing encrypted running sums. The
        winner is credited with an encrypted amount. No plaintext winner index is produced, and
        no winner address is emitted — which is why this page never shows one.
      </Callout>
    </div>
  );
}

function Fact({
  label,
  value,
  note,
}: {
  readonly label: string;
  readonly value: string;
  readonly note?: string | undefined;
}) {
  return (
    <Card padding="sm">
      <p className={styles.factLabel}>{label}</p>
      <p className={styles.factValue}>{value}</p>
      {note ? <p className={styles.factNote}>{note}</p> : null}
    </Card>
  );
}
