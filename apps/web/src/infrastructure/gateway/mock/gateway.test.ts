import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { MockPoolGateway } from "./gateway";
import { MockPoolStore } from "./store";

const FUNDER = "0xDe0000000000000000000000000000000000f001" as Address;

describe("MockPoolGateway prize reserve", () => {
  it("moves only available confidential value into the isolated reserve", async () => {
    const store = new MockPoolStore();
    const wallet = store.account(FUNDER);
    wallet.confidentialBalance = 40_000_000n;
    wallet.poolOperatorUntil = Math.floor(Date.now() / 1000) + 3_600;
    const reserveBefore = store.prizeReserve;
    const gateway = new MockPoolGateway({ account: FUNDER, latencyScale: 0 }, store);

    // ERC-7984 confidential transfers clamp rather than reveal a balance by reverting.
    await gateway.fundPrizeReserve(100_000_000n);

    expect(wallet.confidentialBalance).toBe(0n);
    expect(store.prizeReserve).toBe(reserveBefore + 40_000_000n);
  });

  it("requires time-bounded pool operator authorisation", async () => {
    const store = new MockPoolStore();
    store.account(FUNDER).confidentialBalance = 40_000_000n;
    const gateway = new MockPoolGateway({ account: FUNDER, latencyScale: 0 }, store);

    await expect(gateway.fundPrizeReserve(25_000_000n)).rejects.toMatchObject({
      code: "missing-operator-approval",
    });
  });
});
