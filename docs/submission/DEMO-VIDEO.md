# Three-minute demonstration — script and shot list

Format: real person on camera for the open and close, screen capture with
voice-over throughout the middle. Sepolia, live, no cuts inside a transaction.

Total: 3:00. The timings below are tight on purpose — the flow is long, and the
temptation is to explain the cryptography instead of showing the product.

---

## 0:00–0:20 — Open, on camera

> "Prize savings works. You put money in, you keep it, and periodically someone
> wins a prize funded by the yield. On a public chain it also publishes your
> balance, your odds, and whether you won — permanently, to anyone who looks.
>
> This is VEIL Pool. Same mechanism, and none of that is visible."

**Shot:** person, then cut to the landing page.

**Note:** lead with the problem, not with FHE. The word "encryption" does not
appear until 1:10, and it lands better for the wait.

## 0:20–0:35 — Landing page

Scroll to the two-column comparison: what a public pool publishes, what VEIL Pool
publishes.

> "A public pool publishes your exact balance and your odds. We publish that a
> wallet participated, how many wallets are in the pool, and the prize — enough
> for anyone to verify a draw ran honestly, and nothing else."

**Shot:** the comparison cards, held long enough to read.

## 0:35–1:05 — Get in

Faucet → shield → deposit, at speed. The guided walkthrough panel is visible
throughout.

> "Mint test USDT. Shield it into a confidential token — and this step is public,
> which the interface says out loud. Then deposit."

Pause on the deposit stepper as it runs: *checking, encrypting, waiting for your
wallet, confirming*.

> "The amount is encrypted in the browser before it is sent. The pool adds it to
> a total it never decrypts."

**Shot:** stepper in motion, then the privacy receipt.

**Note:** the receipt's second column — "visible on-chain" — should be on screen
for at least two seconds. It is the most credible thing in the video.

## 1:05–1:30 — Reveal

Click *Sign to reveal*. Wallet prompt. Values appear.

> "Your balance is a ciphertext on-chain. To read it you sign an EIP-712 request
> that authorises decryption — it cannot move funds — and the value is decrypted
> here, in the browser. One signature covers every figure you own."

Click *Hide values*. They seal again.

> "And it goes away when you are done."

**Shot:** the cipher block resolving into a number, then sealing again. This is
the single most important shot in the video — hold it.

## 1:30–2:15 — The draw

Navigate to the draw room. Countdown at zero.

> "Anyone can seal a ready draw. The contract generates encrypted randomness
> on-chain, then walks every participant comparing encrypted running sums against
> an encrypted target."

Seal it. The pool surface pulses; the scan progresses.

> "Every comparison happens under encryption. The contract can't branch on the
> result, so it walks the whole list either way and credits an encrypted amount
> that is the prize for exactly one participant and zero for everyone else."

Draw settles. Nothing is highlighted.

> "Notice what didn't happen. No winner was announced. There is no plaintext
> winner anywhere in the transaction — so there's nothing for this page to show."

**Shot:** the settled draw with no winner highlighted, held for a beat. The
absence is the point; let it be uncomfortable for a second.

## 2:15–2:40 — Result, claim, withdraw

Back to the vault. Reveal winnings. Claim. Then withdraw principal.

> "You find out by decrypting your own result. And whether or not you won, your
> principal was never at stake — prizes come from a separate reserve, and a draw
> cannot touch a deposit."

**Shot:** withdrawal confirming, balance returning.

## 2:40–3:00 — Close, on camera

> "Everything you saw ran on Sepolia against the Zama Protocol. Balances,
> odds, the draw target, and the winner are encrypted on-chain — not on a server,
> not behind a login.
>
> The parts that are still public — that you participated, when, and how much you
> shielded — are documented in the app itself, because a privacy product that
> oversells is worse than one that doesn't exist."

**Shot:** person, then the URL card.

---

## Shot list

| # | Shot | Source |
| --- | --- | --- |
| 1 | Presenter, open | Camera |
| 2 | Landing hero | `/` |
| 3 | Public-vs-VEIL comparison | `/` |
| 4 | Faucet mint | `/pool#faucet` |
| 5 | Shield, with the public-step warning visible | `/pool#shield` |
| 6 | Deposit stepper mid-flow | `/pool#deposit` |
| 7 | Privacy receipt, both columns | `/pool#deposit` |
| 8 | Reveal: cipher block → number | `/pool` |
| 9 | Hide values: number → cipher block | `/pool` |
| 10 | Draw room, countdown at zero | `/draws` |
| 11 | Seal, surface pulsing, scan progressing | `/draws` |
| 12 | Settled draw, no winner shown | `/draws` |
| 13 | Vault: winnings revealed | `/vault` |
| 14 | Claim, with the timing warning visible | `/vault` |
| 15 | Withdraw confirming | `/pool#withdraw` |
| 16 | Presenter, close | Camera |
| 17 | Etherscan: the seal transaction | Explorer |

## Preparation

- Fund the wallet with Sepolia ETH and pre-mint USDT, so no shot waits on a
  faucet.
- Have a second wallet already deposited, so the participant count is not 1.
- Set the draw interval short enough that the countdown reaches zero on camera.
- Dark theme, reduced motion **off**, browser zoom at 110% for legibility.
- Do not cut inside a transaction. The waiting is the honest part.

## What not to say

- Do not say "perfectly unbiased" or "provably fair". The bias bound is
  documented by the protocol workstream; quote that or say nothing.
- Do not say "fully private" or "anonymous". Participation is public.
- Do not call the prize reserve yield. It is a funded demo reserve on Sepolia.
