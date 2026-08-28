# ADR-003: Encrypted random range reduction

Status: Multiply-high selected for continued validation

## Context

Zama can generate encrypted random integers with a public bound, but the pool's
total eligible weight is encrypted. The protocol needs a target in `[0, T)` without
revealing `T`.

## Candidates

- Encrypted remainder: `R mod T` — rejected because the installed FHE Solidity
  library only exposes remainder with a plaintext divisor.
- Multiply-high: `floor(R * T / 2^k)` — supported using a widened encrypted
  product followed by a plaintext right shift.

## Acceptance criteria

- Defined behavior when `T = 0`
- No overflow or truncation
- Quantified distribution bias
- Supported operations and casts in the selected FHEVM version
- Acceptable HCU/gas at the participant limit
- Differential equivalence with the executable reference model

## Current decision

Continue with a 64-bit random value, widen the encrypted total to 128 bits,
multiply into an encrypted 128-bit product, shift right by 64, and cast the
result to 64 bits. The laboratory must still validate runtime behavior, ACLs,
statistical bounds, and operation cost before this ADR becomes accepted.
