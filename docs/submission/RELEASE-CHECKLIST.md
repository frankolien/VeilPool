# VEIL Pool release checklist

This is the final evidence gate for the Sepolia bounty release. Run it with two
independent wallets. Never reuse a plaintext balance or a locally decrypted
result as evidence for the other wallet.

## Fixed release deployment

| Item | Value |
| --- | --- |
| Network | Sepolia (`11155111`) |
| Pool | `0x46586569269A86A362E8814531543CAfc6972Baf` |
| cUSDT | `0x4E7B06D78965594eB5EF5414c357ca21E1554491` |
| Mock USDT | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Prize | 25 cUSDT from the encrypted demo reserve |
| Participant cap | 20 |

## Automated gate

Run from the repository root with Node 22 LTS:

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
pnpm lint
pnpm --filter @veil/contracts-production preflight:sepolia
pnpm --filter @veil/contracts-production smoke:sepolia
```

Every command must exit zero. Preflight must print `"broadcast": false`.

Last clean run: **September 1, 2026**, Node `v22.20.0` — 50 tests passed,
typecheck/build/lint passed, Sepolia preflight returned `"broadcast": false`,
and the smoke check found draw `#4` healthy with deposits and draws unpaused.

## Two-wallet lifecycle

Use Wallet A and Wallet B. Record the transaction hash immediately after each
confirmed write.

| # | Check | Wallet A | Wallet B | Pass condition |
| --- | --- | --- | --- | --- |
| 1 | Faucet mock USDT | hash: | hash: | Public balances increase |
| 2 | Approve wrapper | hash: | hash: | Allowances cover shield amounts |
| 3 | Shield to cUSDT | hash: | hash: | Confidential handles change |
| 4 | Authorise pool | hash: | hash: | Pool is an active operator |
| 5 | Deposit | hash: | hash: | Both wallets become participants; no plaintext amount event |
| 6 | Reveal principal | signed: | signed: | Each wallet sees only its own principal in-browser |
| 7 | Seal draw | hash: | — | On-chain FHE randomness and weighted scan settle the draw |
| 8 | Reveal result | signed: | signed: | Exactly one wallet sees the 25 cUSDT winnings delta |
| 9 | Claim winner | hash: | hash/N/A: | Winner's encrypted winnings move to confidential balance |
| 10 | Withdraw principal | hash: | hash: | Full deposited principal returns for both wallets |

## Evidence to retain

- One Etherscan link for every write above.
- Screenshot before reveal showing a real ciphertext handle.
- Screenshot after EIP-712 reveal showing the local plaintext.
- Screenshot of the settled draw with no public winner.
- Screenshot of both final principal withdrawals.
- Browser console capture with no uncaught errors.
- Final live URL tested in a clean browser session and on a mobile viewport.

## Release blockers

Do not publish the submission as complete if any of these are true:

- A losing wallet cannot withdraw its full principal.
- The winner is emitted or inferable from a public winner field.
- A decrypted value, signature, or decryption key reaches storage, a URL, or telemetry.
- The draw is described as real yield rather than a funded Sepolia reserve.
- The participant count is presented as private.
- A screenshot or video uses mock mode without its demo-data disclosure.

## Submission handoff

- [x] Public GitHub repository: <https://github.com/frankolien/VeilPool>
- [x] Stable public web URL: <https://veil-pool.vercel.app>
- [x] README contains live URL and verified contract links
- [x] Final deployed desktop and mobile screenshots replace stale README captures
- [ ] Real-person video is no longer than three minutes and plays at normal speed
- [ ] X thread/article is published
- [ ] Submission form is completed before September 5, 23:59 AOE
