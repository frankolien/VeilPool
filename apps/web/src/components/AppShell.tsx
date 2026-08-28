"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button, clsx } from "@veil/ui";
import { PRODUCT } from "@/config/product";
import { isMockMode } from "@/config/environment";
import { useConnection } from "@/infrastructure/wallet/context";
import { DEFAULT_NETWORK, getVeilNetwork, isNetworkReady, VEIL_NETWORKS } from "@/config/networks";
import styles from "./AppShell.module.css";

const NAV = [
  { href: "/pool", label: "Overview" },
  { href: "/draws", label: "Draws" },
  { href: "/vault", label: "Vault" },
  { href: "/how-it-works", label: "Protocol" },
] as const;

export function AppShell({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className={styles.shell}>
      {isMockMode ? <DemoDataBanner /> : null}
      <Header pathname={pathname} showNav={!isLanding} />
      <main id="main" className={clsx(styles.main, isLanding && styles.mainWide)}>
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * The standing demo-data notice.
 *
 * Mock mode must never be mistakeable for a live pool. The banner is persistent
 * and not dismissible, because a dismissed banner is exactly the state in which
 * someone screenshots simulated figures as if they were real.
 */
function DemoDataBanner() {
  return (
    <div className={styles.demoBanner} role="note">
      <strong>Demo data.</strong> This build runs against an in-memory simulation of the
      protocol. No transaction is real and no figure on this page is on-chain.
    </div>
  );
}

function Header({ pathname, showNav }: { readonly pathname: string; readonly showNav: boolean }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <VeilMark />
          <span className={styles.brandName}>{PRODUCT.name}</span>
        </Link>

        {showNav ? (
          <nav className={styles.nav} aria-label="Primary">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(styles.navLink, active && styles.navLinkActive)}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className={styles.headerRight}>
          <NetworkSelector />
          <ConnectControl />
        </div>
      </div>
    </header>
  );
}

function NetworkSelector() {
  const { chainId, isConnected, switchChain } = useConnection();
  const known = getVeilNetwork(chainId);
  const active = known ?? DEFAULT_NETWORK;

  return (
    <label className={styles.networkPicker} title="Choose VEIL network">
      <i className={styles.networkDot} />
      <span className={styles.networkLabel}>Network</span>
      <select
        aria-label="VEIL network"
        value={isConnected && !known ? "unsupported" : active.chainId}
        onChange={(event) => switchChain(Number(event.target.value) as 1 | 11_155_111)}
        disabled={!isConnected}
      >
        {isConnected && !known ? <option value="unsupported">Unsupported network</option> : null}
        {VEIL_NETWORKS.map((network) => (
          <option key={network.chainId} value={network.chainId} disabled={!isNetworkReady(network)}>
            {network.name}{isNetworkReady(network) ? " · Live" : " · Coming soon"}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConnectControl() {
  const { isConnected, address, isConnecting, connect, disconnect } = useConnection();

  if (!isConnected || !address) {
    return (
      <Button size="sm" onClick={connect} loading={isConnecting}>
        {isConnecting ? "Connecting" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="secondary" onClick={disconnect}>
      {`${address.slice(0, 6)}…${address.slice(-4)}`}
    </Button>
  );
}

/**
 * The mark: a droplet entering a surface.
 *
 * Not a padlock. The product is about a shared pool whose contents are
 * indistinguishable, and a padlock would say "locked away", which is the
 * opposite of what the protocol does.
 */
function VeilMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={styles.mark}>
      <path
        d="M12 3.5c3.4 4 5.2 6.7 5.2 9a5.2 5.2 0 0 1-10.4 0c0-2.3 1.8-5 5.2-9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4 18.5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      <path d="M6.5 21.2h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerNote}>
          {PRODUCT.name} is a Sepolia testnet demonstration built on the Zama Protocol. The prize
          reserve is funded for the demo and does not represent yield.
        </p>
        <div className={styles.footerLinks}>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/how-it-works#privacy">Privacy boundary</Link>
        </div>
      </div>
    </footer>
  );
}
