# VEIL Pool engineering ownership

This repository is maintained by two engineering workstreams.

## Protocol workstream

Owns `packages/contracts`, `packages/reference-model`, `packages/contract-abi`,
`scripts/deploy`, `scripts/keeper`, `docs/protocol`, and `docs/security`.

Protocol-facing behavior must preserve principal, prize solvency, ciphertext ACLs,
and the documented confidentiality boundary. Never claim exact weighted fairness
without linking the approved range-reduction analysis.

## Product workstream

Owns `apps/web`, `packages/ui`, `docs/product`, and `docs/submission`.

The web app consumes generated ABIs and deployment data from
`packages/contract-abi`; it must not maintain hand-copied contract interfaces.
Decrypted financial values, signatures, and local decryption keys must never be
sent to telemetry.

## Shared changes

Changes to `packages/shared-types`, public contract functions, events, errors,
enums, or privacy claims require an architectural decision record in
`docs/decisions`.

