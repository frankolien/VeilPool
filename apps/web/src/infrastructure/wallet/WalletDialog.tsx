"use client";

import { useEffect, useRef } from "react";
import type { Connector } from "wagmi";
import { Button } from "@veil/ui";
import styles from "./WalletDialog.module.css";

/**
 * The connect dialog.
 *
 * A native `<dialog>` element: it brings focus trapping, Escape-to-close, inert
 * background and the correct role without a library or a `useEffect` that tries
 * to re-implement them.
 */
export function WalletDialog({
  open,
  connectors,
  onSelect,
  onClose,
}: {
  readonly open: boolean;
  readonly connectors: readonly Connector[];
  readonly onSelect: (connector: Connector) => void;
  readonly onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose} aria-label="Connect a wallet">
      <h2 className={styles.title}>Connect a wallet</h2>
      <p className={styles.body}>
        VEIL Pool needs a wallet on Sepolia to read your encrypted position and to sign
        decryption requests.
      </p>

      <ul className={styles.list}>
        {connectors.map((connector) => (
          <li key={connector.uid}>
            <button type="button" className={styles.option} onClick={() => onSelect(connector)}>
              {connector.name}
            </button>
          </li>
        ))}
      </ul>

      {connectors.length === 0 ? (
        <p className={styles.empty}>
          No wallet detected. Install a browser wallet, or configure a WalletConnect project id.
        </p>
      ) : null}

      <Button variant="ghost" onClick={onClose} fullWidth>
        Cancel
      </Button>
    </dialog>
  );
}
