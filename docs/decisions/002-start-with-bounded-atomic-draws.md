# ADR-002: Start with bounded atomic draws

Status: Proposed pending benchmark

## Context

Batched encrypted scans require immutable balance snapshots, progress recovery,
and rules for concurrent withdrawal. Those mechanisms substantially expand the
attack surface.

## Decision

Prototype an atomic prefix scan with an enforced participant maximum determined
by Sepolia FHE/HCU benchmarks.

## Consequences

- The complete selection occurs in one transaction.
- Draw reasoning and replay protection remain simple.
- Capacity is deliberately bounded and honestly documented.
- If benchmarks are unacceptable, this ADR must be superseded by a snapshot design.

