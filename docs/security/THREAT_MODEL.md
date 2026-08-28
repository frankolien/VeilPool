# Threat model

Status: Draft

## Protected assets

- User principal and winnings
- Confidential balance and odds
- Integrity and single-use property of every draw
- Prize reserve and aggregate solvency
- User decryption authorization material

## Adversaries

- Passive chain observer performing timing and amount correlation
- Participant submitting malformed ciphertexts or replayed proofs
- Keeper attempting early, duplicate, or selectively timed draws
- Administrator attempting to seize principal or bias selection
- Reentrant or non-conforming token receiver
- Compromised frontend or analytics pipeline
- Relayer, RPC, coprocessor, or KMS outage

## Trust assumptions

- Zama's host contracts, coprocessors, KMS, proof verification, and FHE primitives
  satisfy their documented security assumptions.
- The configured ERC-7984 implementation correctly returns the actual encrypted
  amount transferred.
- The deployed bytecode matches the verified source and published deployment manifest.

## Mandatory controls

- Use actual transferred ciphertexts for accounting.
- Refresh persistent ACL permissions after every ciphertext update.
- Use transient ACL permissions for single-transaction cross-contract use.
- Separate deposit, draw, and exceptional withdrawal pause controls.
- Apply checks-effects-interactions and a reentrancy guard to settlement.
- Never log decrypted values, signatures, or generated private keys.
- Bound all encrypted arithmetic to prevent silent wraparound.
- Test confidential failure paths that resolve to encrypted zero.

