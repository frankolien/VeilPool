# ADR-001: Use ERC-7984 cUSDT as the pool asset

Status: Accepted

## Context

Holding public ERC-20 assets in the pool would require public withdrawal transfers
or asynchronous public decryption, exposing amounts at the pool boundary.

## Decision

The pool accepts and returns an ERC-7984 confidential token. The application
provides a separate public ERC-20 shield/unshield flow.

## Consequences

- Deposits, withdrawals, and prize settlement can remain confidential transfers.
- Public wrapping and unwrapping amounts remain observable and must be disclosed.
- ERC-7984 ACL and operator behavior becomes a critical integration dependency.

