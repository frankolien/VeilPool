"use client";

import { useEffect, useMemo, useState } from "react";
import { getPublicClient } from "@wagmi/core";
import { formatUnits } from "viem";
import { confidentialPrizePoolAbi, requireDeployment } from "@veil/contract-abi";
import { appConfig } from "@/config/environment";
import { wagmiConfig } from "@/infrastructure/chain/wagmi";
import styles from "@/app/landing.module.css";

type DrawSnapshot = {
  readonly drawId: number;
  readonly nextDrawAt: number;
  readonly prize: bigint;
};

const deployment = requireDeployment(appConfig.chainId);

export function LiveDrawCard() {
  const [snapshot, setSnapshot] = useState<DrawSnapshot | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const client = getPublicClient(wagmiConfig);
        if (!client) throw new Error("Sepolia RPC unavailable");
        const pool = deployment.pool.address;
        const [drawId, nextDrawAt, prize] = await Promise.all([
          client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "currentDrawId" }),
          client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "nextDrawAt" }),
          client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "prizePerDraw" }),
        ]);
        if (active) {
          setSnapshot({ drawId: Number(drawId), nextDrawAt: Number(nextDrawAt), prize });
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    }

    void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 12_000);
    const clockTimer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const countdown = useMemo(
    () => snapshot ? formatCountdown(Math.max(0, snapshot.nextDrawAt - now)) : "--:--",
    [snapshot, now],
  );
  const prize = snapshot ? formatUnits(snapshot.prize, 6) : "—";

  return (
    <div className={styles.liveCard} aria-live="polite">
      <div><span>Next private draw{snapshot ? ` · #${snapshot.drawId}` : ""}</span><b>{countdown}</b></div>
      <div className={styles.prizeRow}><span>Prize reserve</span><strong>{prize} <small>cUSDT</small></strong></div>
      <div className={styles.liveRule}>
        <i />
        <span>{failed ? "Sepolia data temporarily unavailable" : "Live · encrypted selection runs onchain"}</span>
      </div>
    </div>
  );
}

function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
