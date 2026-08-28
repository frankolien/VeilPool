# VEIL Pool contracts

This workspace begins with a range-reduction laboratory. The laboratory is not a
production pool: it exists to validate encrypted random mapping, zero-total safety,
ACL behavior, and FHE operation cost before the weighted draw is frozen. Encrypted
remainder was rejected at compile time because the current library only permits a
plaintext divisor; the active candidate is widened multiply-high scaling.

```bash
pnpm --filter @veil/contracts build
pnpm --filter @veil/contracts test
```

The production pool will only be added after ADR-003 is accepted.

This workspace is intentionally pinned to the Hardhat mock-compatible FHEVM
version. The current Hardhat plugin rejects the Sepolia v0.13 Solidity package,
so production v0.13 contracts must live in a separate workspace and may not use
passing legacy mock tests as evidence of Sepolia compatibility.
