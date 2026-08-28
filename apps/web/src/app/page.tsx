import Image from "next/image";
import { ButtonLink } from "@veil/ui";
import { LiveDrawCard } from "@/components/LiveDrawCard";
import { LandingExplainer } from "@/components/LandingExplainers";
import styles from "./landing.module.css";

export default function LandingPage() {
  return <>
    <section className={styles.campaign}>
      <Image className={styles.campaignMedia} src="/brand/veil-glass-vault-v2.webp" alt="A cobalt optical-glass vault gathering hundreds of private deposits into one prize" fill priority sizes="100vw" />
      <div className={styles.campaignShade} aria-hidden="true" />
      <div className={styles.campaignCopy}>
        <p className={styles.kicker}>Confidential prize savings · Built on Zama</p>
        <h1>Save in private. <br /><i>Win in public.</i></h1>
        <p className={styles.campaignDek}>Your balance stays encrypted. Your principal stays yours. The pool’s yield becomes someone’s prize.</p>
        <div className={styles.actions}><ButtonLink href="/pool" size="lg">Enter the pool ↗</ButtonLink><LandingExplainer kind="privacy">How privacy works</LandingExplainer></div>
      </div>
      <LiveDrawCard />
      <div className={styles.campaignCaption}><span>01</span><p>Many deposits enter.<br />Only the prize leaves.</p></div>
    </section>

    <section className={styles.ticker}>
      <span>PRINCIPAL PROTECTED</span><b>◆</b><span>BALANCES ENCRYPTED</span><b>◆</b><span>WEIGHTED FHE DRAW</span><b>◆</b><span>WINNER PRIVATE</span><b>◆</b><span>WITHDRAW ANYTIME</span>
    </section>

    <section className={styles.statement}>
      <p className={styles.sectionLabel}>01 — Why VEIL</p>
      <h2>Saving should build wealth.<br />Not broadcast it.</h2>
      <div className={styles.statementCopy}><p>Every ordinary onchain savings product exposes your balance, behavior and financial history. That is not a harmless side effect. It is permanent intelligence about you.</p><p>VEIL keeps the financial layer encrypted while leaving the rules verifiable. The result is a savings product that could not exist without confidential computation.</p></div>
    </section>

    <section className={styles.mechanism}>
      <div className={styles.mechanismIntro}><p className={styles.sectionLabel}>02 — The mechanism</p><h2>One pool.<br />Three guarantees.</h2><p>Your deposits create your odds, never your downside.</p></div>
      <div className={styles.guarantees}>
        <Guarantee index="01" title="Private by default" copy="Deposits, balances, odds and winnings remain encrypted onchain from entry to exit." />
        <Guarantee index="02" title="Fair by construction" copy="FHE randomness selects proportionally across encrypted balances without revealing the inputs." />
        <Guarantee index="03" title="No loss of principal" copy="Prize liquidity is isolated. Your full principal remains withdrawable at every point in the cycle." />
      </div>
    </section>

    <section className={styles.blueprint}>
      <div className={styles.blueprintCopy}><p className={styles.sectionLabel}>03 — Confidential architecture</p><h2>Proof without<br />financial exposure.</h2><p>The public chain verifies that the draw happened. Zama’s FHE network computes over balances it never sees. Only your wallet can reveal your position.</p><LandingExplainer kind="architecture">Explore the architecture ↗</LandingExplainer></div>
      <ProtocolDiagram />
    </section>

    <section className={styles.visibility}>
      <div><p className={styles.sectionLabel}>04 — Privacy boundary</p><h2>Know exactly<br />what the chain knows.</h2></div>
      <div className={styles.ledger}>
        <Ledger label="Your balance" state="Encrypted" secure /><Ledger label="Deposit amount" state="Encrypted" secure /><Ledger label="Winning odds" state="Encrypted" secure /><Ledger label="Winner identity" state="Encrypted" secure /><Ledger label="Draw schedule" state="Public" /><Ledger label="Contract execution" state="Verifiable" />
      </div>
    </section>

    <section className={styles.cta}><div><p className={styles.sectionLabel}>Built on Zama · Live on Sepolia</p><h2>Save without<br />showing your hand.</h2></div><ButtonLink href="/pool" size="lg">Enter the pool ↗</ButtonLink></section>
  </>;
}

function Guarantee({index,title,copy}:{index:string;title:string;copy:string}) { return <article><span>{index}</span><h3>{title}</h3><p>{copy}</p><i>↗</i></article>; }
function Ledger({label,state,secure=false}:{label:string;state:string;secure?:boolean}) { return <div><span>{label}</span><strong className={secure?styles.secure:""}><i />{state}</strong></div>; }
function ProtocolDiagram() { return <div className={styles.diagram} aria-label="VEIL protocol flow"><div className={styles.diagramNode}><small>01</small><b>YOU</b><span>Encrypt locally</span></div><div className={styles.connector}>·················→</div><div className={`${styles.diagramNode} ${styles.diagramCore}`}><small>02</small><b>FHE POOL</b><span>Compute privately</span></div><div className={styles.connector}>·················→</div><div className={styles.diagramNode}><small>03</small><b>YOU</b><span>Decrypt outcome</span></div></div>; }
