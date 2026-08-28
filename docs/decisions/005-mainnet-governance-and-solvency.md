# ADR-005: Mainnet governance and solvency boundary

## Status

Accepted for implementation. Ethereum deployment remains blocked until every
release gate in this record is satisfied.

## Decision

VEIL keeps principal and prize liquidity in independent encrypted ledgers. A
draw may debit only `_prizeReserve`; a withdrawal may debit only the caller's
`_principal`. No owner function can transfer pool assets, alter user balances,
change the immutable prize size, or change the immutable draw interval.

The owner may pause new deposits and/or new draws. Withdrawals and claims remain
available in every pause state. This makes the emergency control a brake on new
risk, not a custody switch.

Mainnet ownership must be assigned at construction to a deployed smart account
or multisig. The deployer must not temporarily own the pool. Deployment
preflight rejects an owner address without bytecode, and the post-deployment
smoke test repeats that assertion from live chain state.

## Solvency invariants

For all reachable states:

1. `totalPrincipal = sum(principal[user])` in encrypted arithmetic.
2. `eligibleTotalPrincipal = sum(principal[user] where prizeActive[user])`.
3. A draw reduces prize reserve by either `prizePerDraw` or zero.
4. A draw never reduces principal.
5. A withdrawal reduces total principal by exactly the confidential amount
   transferred, or by zero when the encrypted request exceeds the balance.
6. A claim clears only the caller's winnings liability.
7. Pausing deposits or draws cannot prevent withdrawal or claim.

Because balances are ciphertexts, public observers cannot recompute these sums.
Assurance therefore comes from constrained state transitions, executable clear
reference-model properties, contract review and live smoke checks—not a public
plaintext proof of reserves.

## Real yield boundary

The initial Ethereum release may use an externally funded encrypted prize
reserve. A yield source must not be introduced by granting an adapter custody of
principal. Any future adapter requires a separate ADR specifying:

- the exact asset conversion and loss model;
- withdrawal liquidity under adverse conditions;
- adapter upgrade and shutdown authority;
- how generated yield enters the encrypted prize reserve;
- additional information leaked by public protocol interactions;
- invariant and fork-test coverage.

Until that design is reviewed, “yield” in product copy means funded prize
liquidity and must be labelled accordingly.

## Ethereum release gates

- Official Zama Ethereum cUSDT address verified against deployed bytecode.
- Deployment simulation succeeds against an Ethereum fork.
- Owner is a funded, tested multisig with documented signers and threshold.
- Prize reserve funding and replenishment runbook approved.
- Contract source verified and deployment manifest committed.
- Post-deployment smoke test passes before the frontend registry is updated.
- Frontend Ethereum option stays disabled until the registry contains the
  verified pool address.
