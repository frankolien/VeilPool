# VEIL Pool protocol specification

Status: Implemented on Sepolia; Ethereum deployment gated

## Purpose

VEIL Pool is a confidential prize-linked savings protocol. Principal and prize
liability are separate accounting domains. Draws may allocate funded prize
liquidity but must never reduce depositor principal.

## State

For each registered participant `i`:

- `P[i]`: encrypted principal
- `W[i]`: encrypted unclaimed winnings
- `registered[i]`: public registration status
- `eligibleFromDraw[i]`: public first eligible draw

Global state:

- `T`: encrypted total principal
- `R`: encrypted unallocated prize reserve
- `L`: encrypted or model-only aggregate prize liability
- `drawId`: public monotonically increasing identifier
- `nextDrawAt`: public timestamp
- `drawState`: public lifecycle state
- `participants`: public bounded address set

## Safety properties

1. `T = sum(P[i])`.
2. Pool assets are at least `T + sum(W[i])`.
3. A draw does not modify `P[i]` or `T`.
4. A withdrawal does not modify `W[i]`.
5. An awarded draw decreases reserve and increases prize liability by the same amount.
6. A claim can transfer at most the caller's winnings and clears the claimed liability.
7. A draw ID is awarded at most once.
8. When eligible total is nonzero, exactly one weighted interval contains the draw target.

## Draw definition

For encrypted eligible weights `w[0..n)` and encrypted total `T > 0`, derive an
encrypted target `x` satisfying `0 <= x < T`. Participant `i` wins precisely when:

`prefix(i) <= x < prefix(i) + w[i]`

where `prefix(i) = sum(w[j])` for `j < i`.

The implementation scans every registered participant and credits either the
encrypted prize or encrypted zero with `FHE.select`. It must not emit the winner
address or branch in plaintext on an encrypted comparison.

## Range-reduction gate

Two candidates must be measured before approval:

1. `target = random mod total`
2. `target = highBits(random * total)`

The accepted method must document its statistical-distance bound, arithmetic
widths, zero-total behavior, and FHE cost. Until then the draw algorithm is not
considered frozen.

## Confidentiality boundary

Encrypted: individual principal, deposited confidential-token amount, individual
weight, winnings, draw target, and result.

Public: wallet participation, participant count and addresses, transaction timing,
draw schedule, configured prize size, the funding wallet, and settlement caller.
The contribution and resulting reserve remain encrypted. Public ERC-20
wrapping/unwrapping amounts may be correlated with nearby confidential actions.
