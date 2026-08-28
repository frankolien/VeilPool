# VEIL Pool production contracts

This workspace targets Zama's Ethereum and Sepolia contract stack:

- `@fhevm/solidity@0.13.3`
- `@openzeppelin/confidential-contracts@0.5.3`

It deliberately does not load the legacy Hardhat FHE mock plugin. Network smoke
tests and the executable reference model are release gates; legacy mock results
from `packages/contracts` are algorithm research evidence only.

## Network policy

Sepolia is the current live product environment. Ethereum support is compiled
into the web and deployment layers, but the interface keeps it disabled until a
VEIL pool address is added to `@veil/contract-abi`. A network name alone must
never be used as evidence that funds are handled by a deployed contract.

Run the read-only production preflight before preparing any Ethereum deployment:

```bash
CONFIDENTIAL_TOKEN_ADDRESS=0xAe0207C757Aa2B4019Ad96edD0092ddc63EF0c50 \
OWNER_ADDRESS=0x-your-deployed-multisig \
PRIZE_PER_DRAW=25000000 \
DRAW_PERIOD_SECONDS=604800 \
pnpm --filter @veil/contracts-production preflight:mainnet
```

Preflight validates the RPC chain ID, official cUSDT address, deployed token
bytecode, draw configuration and deployer balance. It does not broadcast.
On Ethereum it also requires the configured owner to contain deployed bytecode,
preventing an EOA deployer from silently retaining protocol administration.

Mainnet deployment is intentionally blocked unless the operator explicitly sets
`CONFIRM_MAINNET_DEPLOY=DEPLOY_VEIL_TO_ETHEREUM`. That interlock is a final
accident-prevention mechanism, not a substitute for contract review, deployment
simulation, funded-reserve planning, multisig ownership and incident procedures.
