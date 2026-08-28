import type { Metadata } from "next";
import { Callout, Card } from "@veil/ui";
import { PageHeading } from "@/components/PageHeading";
import { INFERENCE_RISKS, PROTECTED_FACTS, PUBLIC_FACTS } from "@/domain/privacy/disclosure";
import styles from "./how-it-works.module.css";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The shielding boundary, encrypted accounting, weighted selection, and exactly what stays public.",
};

/**
 * The explainer.
 *
 * Written so that the confidentiality boundary is impossible to miss: the
 * "what's public" section is the same size and prominence as the mechanism
 * sections, and the inference risks have their own heading rather than a
 * footnote. That is a deliberate cost — it is less flattering copy — and it is
 * the only version of this page that is true.
 */
export default function HowItWorksPage() {
  return (
    <>
      <PageHeading
        title="How it works"
        description="Four mechanisms, and one honest account of what they do not hide."
      />

      <div className={styles.sections}>
        <Section
          number="01"
          title="Shielding: crossing into confidential tokens"
          summary="Public USDT becomes confidential cUSDT through an ERC-7984 wrapper. This step is public — and it is the only one that is."
        >
          <Diagram
            steps={[
              { label: "USDT", tone: "public", note: "public ERC-20" },
              { label: "Wrapper", tone: "neutral", note: "ERC-7984 wrapper" },
              { label: "cUSDT", tone: "private", note: "encrypted balance" },
            ]}
          />
          <p>
            After wrapping, your balance is an encrypted integer. Every later movement — into the
            pool, out of it, between accounts — carries an encrypted amount. The wrap itself moves
            a public ERC-20 amount, so an observer sees how much you shielded and when.
          </p>
          <p>
            This matters in one specific way: shielding and then immediately depositing links the
            two. Depositing cUSDT you already held breaks that link.
          </p>
        </Section>

        <Section
          number="02"
          title="Encrypted accounting"
          summary="The pool stores per-account principal and a pool total as ciphertexts, and never decrypts either."
        >
          <p>
            Deposits arrive as a confidential transfer. The pool adds the encrypted amount to your
            encrypted principal and to an encrypted running total, using homomorphic addition — it
            computes on the ciphertexts without ever seeing the values.
          </p>
          <p>
            Access is granted per value. Your principal is readable by you and by the contract, and
            by nobody else. That grant is what a reveal exercises, and it is enforced on-chain
            rather than by this interface.
          </p>
        </Section>

        <Section
          number="03"
          title="Weighted selection under encryption"
          summary="The contract generates encrypted randomness on-chain and walks every participant, comparing encrypted running sums."
        >
          <p>
            Selection uses prefix sums. Walking participants in order, the contract keeps an
            encrypted cumulative total. A participant wins when the encrypted random target falls
            inside their slice — at or above the running total before them, and below the running
            total after them.
          </p>
          <p>
            Every one of those comparisons happens under encryption, and the outcome of each is
            itself an encrypted boolean. The contract cannot branch on it, so it walks the entire
            participant list either way and credits an encrypted amount that is the prize for
            exactly one participant and zero for everyone else.
          </p>
          <Callout tone="privacy" title="Why no winner is announced">
            There is no plaintext winner index at any point, and no winner address is emitted. That
            is why this application shows a draw completing but never shows who won — the
            information does not exist on-chain to show. You learn your own result by decrypting
            your own winnings.
          </Callout>
          <p className={styles.caveat}>
            Because the pool&rsquo;s total is itself encrypted, the random target cannot be reduced
            with a modulo — encrypted division by an encrypted value is not an available operation.
            The reduction and its distribution are documented by the protocol workstream; this page
            does not claim a fairness property that has not been published.
          </p>
        </Section>

        <Section
          number="04"
          title="Revealing, and principal protection"
          summary="You decrypt your own values in your browser. Your principal is never spent as prize money."
        >
          <p>
            Revealing takes one EIP-712 signature that authorises decryption for a bounded window.
            The ciphertext is fetched and decrypted locally. The signature cannot move funds, the
            decrypted values are held in memory only, and clearing them is a single click.
          </p>
          <p>
            Principal and prize liquidity are separate balances. A draw can only pay from the prize
            reserve; a withdrawal can only pay from principal. There is no path by which losing a
            draw reduces what you deposited.
          </p>
        </Section>
      </div>

      <section id="privacy" className={styles.boundary}>
        <h2 className={styles.boundaryTitle}>The confidentiality boundary</h2>
        <p className={styles.boundaryLead}>
          Encryption hides amounts. It does not hide that a transaction happened, who sent it, or
          when. Both columns below are equally true.
        </p>

        <div className={styles.columns}>
          <Card padding="lg">
            <h3 className={styles.columnHeading}>
              <span className={styles.dotProtected} aria-hidden="true" /> Encrypted
            </h3>
            <dl className={styles.facts}>
              {PROTECTED_FACTS.map((fact) => (
                <div key={fact.id}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.because}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card padding="lg">
            <h3 className={styles.columnHeading}>
              <span className={styles.dotPublic} aria-hidden="true" /> Public
            </h3>
            <dl className={styles.facts}>
              {PUBLIC_FACTS.map((fact) => (
                <div key={fact.id}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.because}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <h3 className={styles.riskTitle}>What can still identify you</h3>
        <dl className={styles.facts}>
          {INFERENCE_RISKS.map((risk) => (
            <div key={risk.id}>
              <dt>{risk.label}</dt>
              <dd>{risk.because}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function Section({
  number,
  title,
  summary,
  children,
}: {
  readonly number: string;
  readonly title: string;
  readonly summary: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.number}>{number}</span>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.summary}>{summary}</p>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function Diagram({
  steps,
}: {
  readonly steps: readonly { label: string; tone: "public" | "neutral" | "private"; note: string }[];
}) {
  return (
    <div className={styles.diagram} role="img" aria-label={steps.map((s) => `${s.label}, ${s.note}`).join(", then ")}>
      {steps.map((step, index) => (
        <div key={step.label} className={styles.diagramGroup}>
          <div className={`${styles.node} ${styles[step.tone]}`}>
            <span className={styles.nodeLabel}>{step.label}</span>
            <span className={styles.nodeNote}>{step.note}</span>
          </div>
          {index < steps.length - 1 ? (
            <span className={styles.connector} aria-hidden="true">
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
