# VEIL Pool — product brief

Owner: product workstream
Status: Living document. Protocol claims here defer to `docs/protocol`.

---

## 1. What it is

VEIL Pool is a confidential prize-linked savings account. Depositors put
stablecoins into a shared pool; a periodic draw awards a prize funded from a
separate reserve, weighted by deposit size. Nobody loses principal, and nobody —
including the protocol — can see who saved how much, whose odds are best, or who
won.

The one-line version, which is what the landing page leads with:

> Save privately. Win privately. Keep every dollar you deposit.

## 2. The problem, stated without cryptography

Prize-linked savings is a proven product: people save more when saving carries a
lottery upside, and they save more still when the downside is removed. The
on-chain version of it works. What does not work is that it publishes a
permanent, searchable record of one person's finances.

A public prize pool reveals, for every participant:

- the exact balance
- the odds, and therefore the balance relative to everyone else's
- every deposit and withdrawal, with amounts and timing
- who won, and how much

That is a behavioural profile and a target list. It is also the reason the
product does not translate to the use cases that would benefit most from it —
payroll-linked saving, community savings circles, emergency funds — where the
participants know each other and the amounts are the point.

The insight is not "PoolTogether with encryption". It is that a savings identity
is the thing worth protecting, and that a prize mechanism is one of the few
places where a public chain's transparency is actively hostile to the product.

## 3. What FHE changes, precisely

The Zama Protocol lets the contract compute on ciphertexts. That buys three
things this product could not otherwise have:

1. **Balances stay encrypted while remaining spendable.** The pool adds an
   encrypted deposit to an encrypted total without decrypting either.
2. **Randomness is generated on-chain, encrypted.** No oracle, no operator, no
   commit-reveal with a trusted party.
3. **Selection runs under encryption.** The contract compares encrypted running
   sums against an encrypted target and credits an encrypted prize. There is no
   plaintext winner index at any point, so there is no winner to leak.

The result is a draw that is publicly verifiable — anyone can confirm it ran, and
that the reserve covered it — while being privately resolved. That combination
does not exist on a transparent chain.

## 4. What it is not

- Not a lottery. Principal is never at stake, and the interface never uses the
  visual language of gambling.
- Not a yield product. On Sepolia the prize reserve is funded for the
  demonstration. Every screen that shows it labels it as such. No APY is quoted
  anywhere, because none is earned.
- Not anonymous. Participation is public. See §7.
- Not a multi-vault marketplace. One cUSDT pool, done properly.

## 5. Primary persona

**The stablecoin saver.** Holds stablecoins, wants them to grow, finds the
prize upside more motivating than a few basis points of yield, and does not want
their balance legible to anyone who looks up their address.

What they need from the interface:

- to understand the product before connecting a wallet
- to always know the next action
- to never wonder whether their principal is at risk
- to check their own position without exposing it
- to be told the truth about what is still visible

### Secondary personas, not built for yet

Named because they shape which primitives are worth having, not because the
submission targets them: payroll-linked saving, community savings circles,
family pools, DAO contributor savings, employer-sponsored incentives,
emerging-market stablecoin savings, confidential customer-reward pools.

Each of these needs exactly the property this protocol provides — a shared pool
where members cannot read each other's balances — and none of them can use a
transparent one.

## 6. The judge's journey

The complete path, executable in the browser with no CLI:

1. Land, and understand the product inside ten seconds
2. Connect a wallet, or explore in mock mode with no wallet at all
3. Switch to Sepolia if needed
4. Mint mock USDT from the faucet
5. Approve the wrapper and shield into cUSDT
6. Authorise the pool as an ERC-7984 operator
7. Encrypt and deposit
8. Sign once, and reveal every private figure locally
9. Watch the draw countdown, and seal the draw when it is ready
10. See the encrypted scan run, with no winner announced
11. Check their own result privately
12. Claim encrypted winnings
13. Withdraw principal in full
14. Optionally unshield back to public USDT

The guided walkthrough panel tracks this and always names the next step. Its
progress is reconciled against chain state, so reloading does not lose it.

## 7. The confidentiality boundary

This is a product decision, not just a documentation one: the interface states
what leaks with the same prominence as what is protected.

**Encrypted:** deposit amounts, per-account principal, the pool total, odds, the
random target, the winner's identity, per-account winnings.

**Public:** that a wallet participates, the participant count, transaction
timing, the prize and reserve size, the draw schedule and state, amounts shielded
or unshielded, gas.

**Correlations that defeat the above:** shielding then immediately depositing;
withdrawing then immediately unshielding; claiming soon after a draw; a pool with
too few participants to hide in.

Every one of these appears in the product surface — in `how-it-works`, in the
per-operation privacy receipts, and inline at the moment the risk is taken. The
claim card on the vault page warns about claim timing *before* the claim button,
not after it.

The reason to be this blunt is simple: a privacy product that oversells is worse
than one that does not exist, because someone will rely on it.

## 8. Product personality

Calm, financially literate, quietly technical. The visual language is a shared
pool of indistinguishable droplets — activity is visible, composition is not.

Concrete rules that follow from it:

- **One cool accent** (teal) marks anything confidential. **One warm accent**
  (amber) is reserved exclusively for the prize and the draw. Reserving the warm
  hue is what lets the draw feel like an event; if amber appeared on ordinary
  buttons it would stop meaning anything.
- **Sealed values render as a cipher block**, not as dots or a blur. Dots read as
  a password field; blur reads as a paywall. A block of hex reads as what it is —
  a ciphertext that exists on-chain and that only this user can open.
- **Droplets are all the same size**, regardless of deposit. A weighted version
  would look better and would leak exactly what the protocol spends its gas
  hiding.
- **No winner is ever highlighted.** During a draw a pulse crosses the surface
  and marks nobody, because the contract emits nobody.
- Avoided entirely: slot machines, wheels, jackpot graphics, meme typography,
  neon, padlock imagery, invented charts, quoted APY.

## 9. Information architecture

| Route | Purpose |
| --- | --- |
| `/` | Understand the product without connecting |
| `/pool` | Position summary, faucet, shield, deposit, withdraw, walkthrough |
| `/draws` | The draw room — countdown, pool surface, seal, verification |
| `/vault` | Private position, savings goal, odds estimate, claim, risks |
| `/how-it-works` | Mechanism and the full confidentiality boundary |

`/pool` is the working surface and carries the guided walkthrough. `/draws` is
the memorable one. `/vault` is where privacy becomes tangible, because it is the
only place the numbers appear.

## 10. Frontend architecture

Four layers, with dependencies pointing inward only:

- **`domain/`** — pure TypeScript. Fixed-point money, the confidential-value
  model, the draw and pool types, the selection algorithm, flow state machines,
  the error taxonomy, the privacy catalogue. No React, no wagmi, no viem client.
  Directly unit-tested.
- **`infrastructure/`** — adapters. The wallet connection, the chain config, and
  the `PoolGateway` implementations. wagmi appears in exactly two files.
- **`features/`** — React modules, one per protocol action.
- **`app/`** — routes, thin.

`PoolGateway` is the seam. Screens are written against it and cannot tell a mock
from a deployment, which is why every flow was demonstrable before a contract
existed — and why the pool-full, reserve-empty and zero-weight states can be
exercised on demand rather than waited for.

Two decisions worth naming because they were not the obvious ones:

- **Flow steps are entered by name, not advanced positionally.** A positional
  `advance()` silently misnumbers every later step when a flow branches — and
  these flows branch, because an approval may or may not be needed.
- **`ConfidentialValue` is a three-state union**, not `bigint | undefined`. A
  value that has no ciphertext behind it is not a balance of zero, and rendering
  it as "0" would invent a number about someone's finances.

## 11. Sensitive-data policy

Decrypted values, EIP-712 signatures and decryption keys live in memory and
nowhere else. They are not written to `localStorage`, not put in a query cache
that could be persisted, and not placed in a URL. They are cleared on disconnect,
on account change, and on demand — "Hide values" is as prominent as "Reveal",
because anyone demonstrating this on a shared screen needs one click to put the
numbers away.

Telemetry receives a `ProductError`'s classification only. The raw message is
dropped, because revert data and SDK payloads can embed handles, addresses and
request bodies.

## 12. Open questions for the protocol workstream

Tracked in `docs/product/interface-requests/`. The two that change the UI:

1. **The final participant cap.** If it is ~20, "pool full" is a first-class
   state rather than an edge case, and the anonymity-set language on
   `how-it-works` needs to say so plainly.
2. **Whether sealing is one transaction or several.** Both are designed and
   both are already handled by the draw room — a single pending transaction, or a
   determinate `processed / total` scan. Which one ships is a protocol call.
