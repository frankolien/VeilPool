"use client";

import { Badge } from "@veil/ui";
import { receiptFor, type ProtocolOperation } from "@/domain/privacy/receipt";
import { transactionUrl } from "@/config/environment";
import styles from "./PrivacyReceiptCard.module.css";

/**
 * What an operation kept private, and what it published.
 *
 * Rendered from the receipt catalogue rather than written per screen, so the
 * claim a user sees after depositing is the same claim the protocol
 * documentation makes. Public metadata comes second but is never omitted — a
 * receipt that only lists protections is an advertisement.
 */
export function PrivacyReceiptCard({
  operation,
  hash,
}: {
  readonly operation: ProtocolOperation;
  readonly hash?: string | null;
}) {
  const receipt = receiptFor(operation);

  return (
    <div className={styles.receipt}>
      <div className={styles.head}>
        <Badge tone="success">{receipt.title}</Badge>
        {hash ? (
          <a
            className={styles.verify}
            href={transactionUrl(hash)}
            target="_blank"
            rel="noreferrer noopener"
          >
            Verify on Etherscan ↗
          </a>
        ) : null}
      </div>

      {receipt.protected.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.heading}>
            <span className={styles.glyphProtected} aria-hidden="true">
              ◆
            </span>
            Kept private
          </h3>
          <ul className={styles.list}>
            {receipt.protected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={styles.section}>
        <h3 className={styles.heading}>
          <span className={styles.glyphPublic} aria-hidden="true">
            ○
          </span>
          Visible on-chain
        </h3>
        <ul className={styles.list}>
          {receipt.publicMetadata.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {receipt.inference ? (
        <p className={styles.inference}>
          {receipt.inference.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
