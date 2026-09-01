# VEIL Pool release report

Release candidate verified on September 1, 2026.

## Public artifacts

- Live application: <https://veil-pool.vercel.app>
- Source repository: <https://github.com/frankolien/VeilPool>
- Vercel production deployment: `dpl_DYrbK1dBCqs8fJ2xiTqVdbvsQTUQ`
- Sepolia pool: <https://sepolia.etherscan.io/address/0x46586569269A86A362E8814531543CAfc6972Baf>
- Confidential cUSDT: <https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491>
- Mock USDT faucet: <https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0>

## Automated evidence

Executed from the repository root with Node `v22.20.0`:

```text
pnpm test                                             PASS — 50 tests
pnpm typecheck                                        PASS
pnpm build                                            PASS — 6 routes prerendered
pnpm lint                                             PASS — zero warnings
pnpm --filter @veil/contracts-production preflight:sepolia  PASS — broadcast false
pnpm --filter @veil/contracts-production smoke:sepolia      PASS
```

The Sepolia smoke response reported draw `#4`, a 25 cUSDT prize, participant
cap 20, and both deposits and draws unpaused. The live deployment returned HTTP
200 for `/`, `/pool`, `/draws`, `/vault`, and `/how-it-works`.

## Browser evidence

- The disconnected landing page reads draw `#4` and its 25 cUSDT prize from
  Sepolia without falling back to demo data.
- The page identifies the network as `Sepolia · Live`.
- Desktop and 390 × 844 mobile layouts were visually checked.
- No browser console warnings or errors were observed during the release pass.
- The public draw read is pinned to Sepolia and has three independent RPC
  transports, so the disconnected page cannot silently read Ethereum or depend
  on one public provider.

## Human evidence still required

These steps deliberately require the submitter and cannot be fabricated or
automated as release evidence:

1. Complete the two-wallet lifecycle table in `RELEASE-CHECKLIST.md` and paste
   every transaction hash.
2. Record the real-person demonstration using `DEMO-VIDEO.md`, then replace the
   video placeholder in `X-THREAD.md`.
3. Publish the X thread and submit the bounty form before the deadline.
