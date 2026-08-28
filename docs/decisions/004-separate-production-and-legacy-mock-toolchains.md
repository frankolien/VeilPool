# ADR-004: Separate production and legacy mock toolchains

Status: Accepted

## Context

Sepolia-era contracts require `@fhevm/solidity@0.13.3`, while
`@fhevm/hardhat-plugin@0.4.2` is built for `@fhevm/solidity@0.11.x`. The plugin
actively rejects the newer `ZamaConfig.sol`; this was reproduced locally.

## Decision

Keep `packages/contracts` as the legacy-compatible FHE laboratory and create a
separate production contract workspace pinned to FHEVM Solidity v0.13.3 and
OpenZeppelin Confidential Contracts v0.5.3. Production compilation and Sepolia
smoke tests are authoritative. The executable cleartext reference model remains
the differential oracle for protocol invariants.

## Consequences

- A green legacy mock test is not presented as proof of Sepolia compatibility.
- Shared algorithm vectors must run against both workspaces.
- Production contracts cannot import the legacy Hardhat plugin.
- Sepolia smoke testing becomes a required release gate, not an optional check.
