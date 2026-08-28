"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./LandingExplainers.module.css";

type ExplainerKind = "privacy" | "architecture";

export function LandingExplainer({ kind, children }: { readonly kind: ExplainerKind; readonly children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        className={styles.sheet}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        aria-label={kind === "privacy" ? "How VEIL privacy works" : "VEIL confidential architecture"}
      >
        <div className={styles.handle} aria-hidden="true" />
        <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close explainer">
          Close <span>×</span>
        </button>
        {kind === "privacy" ? <PrivacyStory /> : <ArchitectureStory />}
      </dialog>
    </>
  );
}

function PrivacyStory() {
  return (
    <div className={styles.story}>
      <header className={styles.storyHeader}>
        <p>Privacy, without vague promises</p>
        <h2>The chain proves the rules.<br /><i>It never learns your number.</i></h2>
        <span>Your wallet is the only place your financial position becomes readable.</span>
      </header>

      <div className={styles.privacyGrid}>
        <article className={styles.privatePanel}>
          <small>Encrypted end-to-end</small>
          <PrivacyRow label="Deposit amount" detail="Ciphertext" />
          <PrivacyRow label="Pool balance" detail="Ciphertext" />
          <PrivacyRow label="Winning odds" detail="Computed privately" />
          <PrivacyRow label="Prize amount claimed" detail="Ciphertext" />
        </article>
        <article className={styles.publicPanel}>
          <small>Visible by design</small>
          <PrivacyRow label="Wallet interaction" detail="Public address" publicValue />
          <PrivacyRow label="Transaction timing" detail="Public timestamp" publicValue />
          <PrivacyRow label="Draw schedule" detail="Public rule" publicValue />
          <PrivacyRow label="Contract code" detail="Open verification" publicValue />
        </article>
      </div>

      <div className={styles.truthNote}>
        <b>What this means in real life</b>
        <p>An observer can see that your wallet used VEIL, but cannot read how much you saved, your pool weight, or the encrypted amount transferred when you claim or withdraw.</p>
      </div>
    </div>
  );
}

function PrivacyRow({ label, detail, publicValue = false }: { readonly label: string; readonly detail: string; readonly publicValue?: boolean }) {
  return <div className={styles.privacyRow}><span>{label}</span><strong className={publicValue ? styles.publicValue : undefined}><i />{detail}</strong></div>;
}

function ArchitectureStory() {
  return (
    <div className={`${styles.story} ${styles.architectureStory}`}>
      <header className={styles.storyHeader}>
        <p>The five-second mental model</p>
        <h2>Money enters once.<br /><i>Privacy follows it everywhere.</i></h2>
        <span>VEIL separates custody, confidential computation and personal decryption into distinct trust boundaries.</span>
      </header>

      <div className={styles.architectureCanvas} aria-label="Five-stage VEIL architecture">
        <div className={styles.flowLine} aria-hidden="true" />
        <ArchitectureNode number="01" title="Your wallet" copy="Encrypts the amount locally before anything is submitted." tone="wallet" />
        <ArchitectureNode number="02" title="cUSDT" copy="ERC-7984 moves value while the amount remains ciphertext." tone="token" />
        <ArchitectureNode number="03" title="VEIL Pool" copy="Keeps principal and prize liquidity in separate encrypted ledgers." tone="pool" />
        <ArchitectureNode number="04" title="FHE draw" copy="Randomness and weighted selection run over encrypted balances." tone="compute" />
        <ArchitectureNode number="05" title="Only you" copy="An EIP-712 permit lets your browser decrypt your result." tone="user" />
      </div>

      <div className={styles.architectureLegend}>
        <div><span className={styles.legendCipher}>••••</span><p><b>Ciphertext travels onchain</b>The network handles value without seeing the amount.</p></div>
        <div><span className={styles.legendProof}>✓</span><p><b>Rules remain verifiable</b>Anyone can inspect execution, timing and contract code.</p></div>
        <div><span className={styles.legendExit}>↗</span><p><b>Principal always has an exit</b>Pauses can stop deposits and draws—not claims or withdrawals.</p></div>
      </div>
    </div>
  );
}

function ArchitectureNode({ number, title, copy, tone }: { readonly number: string; readonly title: string; readonly copy: string; readonly tone: string }) {
  return (
    <article className={`${styles.architectureNode} ${styles[tone]}`}>
      <small>{number}</small>
      <div className={styles.nodeGlyph} aria-hidden="true"><span /></div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}
