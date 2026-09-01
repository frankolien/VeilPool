# X thread — draft

Ten posts. Post 1 has to work as a standalone, because most people will only see
that one. Tag `@zama` and `#ZamaDeveloperProgram`.

---

**1/**

Prize savings works: you keep your principal, and periodically someone wins the
yield.

On a public chain it also publishes your balance, your odds, and whether you won.
Forever. To anyone.

We built the version where none of that is visible.

Meet VEIL Pool 🧵

*[Attach: landing page, the public-vs-VEIL comparison]*

---

**2/**

The problem isn't that prize savings is a bad mechanism. It's a great one.

The problem is that on-chain, it doubles as a permanent, searchable record of one
person's finances — and a list of which wallets are worth targeting.

---

**3/**

VEIL Pool runs the same mechanism on @zama's FHE protocol.

Deposits, balances, odds, the draw's random target, and the winner are all
encrypted on-chain.

Not on a server. Not behind a login. On-chain, as ciphertext.

---

**4/**

The part most people don't expect:

The contract *computes on the encrypted values*. It adds your encrypted deposit
to an encrypted total it never decrypts.

Nobody holds a key that opens the pool. Not us, not a multisig, not an operator.

---

**5/**

The draw is the interesting bit.

The contract generates encrypted randomness on-chain, then walks every
participant comparing encrypted running sums against an encrypted target.

Deposit twice as much → twice the weight. All under encryption.

*[Attach: draw room, scan in progress]*

---

**6/**

Every comparison produces an *encrypted* boolean. The contract can't branch on
it.

So it walks the entire participant list either way, and credits an amount that's
the prize for exactly one participant and zero for everyone else.

No plaintext winner exists. Anywhere.

---

**7/**

Which means the app can't show you who won — there's nothing to show.

You find out by decrypting your own result: one EIP-712 signature that authorises
decryption, values decrypted in your browser, cleared with one click.

*[Attach: reveal — cipher block resolving into a number]*

---

**8/**

Principal is never at stake.

Deposits and prize liquidity are separate balances. A draw can only pay from the
reserve; a withdrawal can only pay from your principal.

Losing a draw changes nothing at all.

---

**9/**

What's still public, because we're not going to pretend otherwise:

• that a wallet participated
• the participant count
• transaction timing
• amounts you shield or unshield
• the prize size, so solvency is verifiable

All of it documented in the app itself.

---

**10/**

Live on Sepolia. Open source. No CLI needed — the whole flow runs in the browser.

→ https://veil-pool.vercel.app
→ https://github.com/frankolien/VeilPool
→ [3-min demo]

Built for the @zama Developer Program Mainnet Season 4.
#ZamaDeveloperProgram

---

## Notes on the draft

- Post 6 is the technical payoff and post 7 is the product payoff. If the thread
  has to be cut, cut 2 and 8 — not those.
- Post 9 exists on purpose. Threads that only list protections read as marketing;
  the one that names its own leaks is the one people trust. It also tends to be
  the most-quoted post in threads like this.
- Do not claim "provably fair" or "perfectly unbiased" — the bias bound belongs
  to the protocol workstream's analysis. Link it rather than paraphrasing it.
- Do not claim anonymity. Participation is public.
