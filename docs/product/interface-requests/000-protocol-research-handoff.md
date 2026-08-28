# Research handoff to the protocol workstream

From: product workstream
Date: 2026-08-27
Status: Findings, not decisions. Protocol workstream owns the resolution.

While selecting the frontend SDK I had to pin exact package versions and read the
shipped `FHE.sol`. Three findings bear directly on `ADR-002` and `ADR-003`, so they
are recorded here rather than left in a chat log. Nothing in `docs/protocol`,
`docs/security`, or `docs/decisions` was modified.

Every claim below was verified against the published artifacts named in
"Provenance", not from memory.

---

## Finding 1 — encrypted remainder is not implementable (blocks ADR-003)

`ADR-003` lists "encrypted remainder: `R mod T`" as a candidate. In
`@fhevm/solidity@0.13.3` the only remainder and division signatures are
scalar-divisor:

```solidity
function div(euint64 a, uint64 b) internal returns (euint64);
function rem(euint64 a, uint64 b) internal returns (euint64);
```

There is no `rem(euint64, euint64)` overload for any width. The divisor must be a
plaintext `uint64`. Since `T` is the encrypted eligible total, `R mod T` cannot be
expressed.

The bounded-randomness helper does not provide an escape either:

```solidity
/**
 * @dev Generates a random encrypted 64-bit unsigned integer in the [0, upperBound) range.
 *      The upperBound must be a power of 2.
 */
function randEuint64(uint64 upperBound) internal returns (euint64);
```

The bound is plaintext *and* must be a power of two, so it cannot be `T` either.

**Consequence:** the candidate list in ADR-003 reduces to one implementable option.

## Finding 2 — multiply-high is expressible, and its bias has a closed form

Every operation the multiply-high reduction needs exists in `0.13.3`:

| Step | Signature | Line in `lib/FHE.sol` |
| --- | --- | --- |
| widen | `asEuint128(euint64)` | 8249 |
| multiply | `mul(euint128, euint128)` | 4865 |
| shift | `shr(euint128, uint8)` | 7651 |
| narrow | `asEuint64(euint128)` | 8178 |

So `x = uint64((uint128(R) * uint128(T)) >> 64)` with `R = FHE.randEuint64()`
uniform on `[0, 2^64)`. Widening to 128 bits before the multiply means the product
never overflows, which addresses the ADR's "no overflow or truncation" criterion.

Bias, for the ADR's "quantified distribution bias" criterion: each target `k` in
`[0, T)` receives either `floor(2^64 / T)` or `ceil(2^64 / T)` preimages, so the
total variation distance from uniform is bounded by `T / 2^64`. At a `T` of 2^48
(≈281M units at six decimals) that is ≈1.5e-5. The bound is exact and worth stating
numerically in the ADR rather than as an adjective.

`T = 0` still needs an explicit decision — the reduction yields `0`, which is a
valid index into an empty candidate set, so the guard has to live in the draw
lifecycle rather than in the reduction.

**Cost:** ≈1.72M HCU, paid once per draw.

| Operation | HCU |
| --- | --- |
| `mul` euint128 non-scalar | 1,686,000 |
| `shr` euint128 scalar | 37,000 |
| 2 widen + 1 narrow casts | 96 |
| `randEuint64` | 24,000 |

## Finding 3 — the participant cap is ~20, and *depth* binds before *global* (ADR-002)

`ADR-002` defers the participant maximum to "Sepolia FHE/HCU benchmarks". A paper
budget from the published cost table puts the answer low enough that it changes the
shape of the decision, so it is worth having before the benchmark runs.

Per participant, for the prefix scan in the handoff's pseudocode:

| Operation | HCU |
| --- | --- |
| `add(euint64, euint64)` — cumulative | 162,000 |
| `ge(euint64, euint64)` — lower bound | 152,000 |
| `lt(euint64, euint64)` — upper bound | 146,000 |
| `and(ebool, ebool)` ×2 | 68,000 |
| `select(ebool, euint64, euint64)` | 55,000 |
| `add(euint64, euint64)` — credit winnings | 162,000 |
| `or(ebool, ebool)` | 34,000 |
| `not(ebool)` | 63 |
| **Total** | **≈779,000** |

Against the two published per-transaction limits:

- Global limit 20,000,000 HCU → ~25 participants, less the ~1.72M reduction if it
  shares the transaction, so ~23.
- Sequential depth limit 5,000,000 HCU → the `cumulative` chain is a strict
  dependency chain of 162,000 HCU per participant, giving ~30 on its own. But the
  comparison and credit for participant *i* also sit on that chain, so the realistic
  critical path is well above 162,000 per step and the depth limit is what fails first.

**Reading:** ~20 participants per transaction is the defensible cap, and the
binding constraint is depth, not global complexity. Two implications for ADR-002:

1. A bounded atomic draw is viable, but the honest bound is ~20 participants — small
   enough that the anonymity-set argument in the threat model and the capacity
   language in the product copy both have to be written around it.
2. Moving the range reduction into its own `sealDraw()` transaction buys back ~1.72M
   HCU and decouples the reduction cost from the scan cost. This is a cheap change
   that raises the cap and makes the benchmark easier to reason about, independent of
   whether ADR-002 ultimately stays atomic.

If the benchmark contradicts any number here, the benchmark wins — this is a paper
budget from a published table, not a measurement.

---

## Finding 4 — `SepoliaConfig` no longer exists (affects any contract skeleton)

Most public FHEVM material, including current tutorials, still shows:

```solidity
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
contract Foo is SepoliaConfig { }
```

In `@fhevm/solidity@0.13.3` the config contracts are `ZamaEthereumConfig`
(mainnet + Sepolia + local 31337), `ZamaPolygonConfig`, and `ZamaMultiChainConfig`,
which routes on `block.chainid`. There is no `SepoliaConfig` symbol. Flagging it
only because it fails at compile time and looks like a bad install.

## Finding 5 — the hardhat plugin lags the protocol

`@fhevm/hardhat-plugin@0.4.2` (published 2026-02-19) declares:

```
"@fhevm/solidity": "^0.11.1",
"@zama-fhe/relayer-sdk": "0.4.1",
"@fhevm/mock-utils": "0.4.2"
```

That range excludes `@fhevm/solidity@0.13.3`, and FHEVM v0.12 changed the handle
format, so the mock utils are unlikely to agree with a v0.13 deployment. Sepolia
currently runs v0.13. This is a toolchain decision for the protocol workstream — I
raise it only because "local mock tests pass, Sepolia reverts" is an expensive
failure to discover in submission week.

---

## Provenance

Versions resolved from the npm registry on 2026-08-27; Solidity line numbers from
the published tarballs, read directly rather than from documentation.

| Package | Version | Published |
| --- | --- | --- |
| `@fhevm/solidity` | 0.13.3 | 2026-08-21 |
| `@fhevm/sdk` | 0.13.3 | 2026-08-21 |
| `@zama-fhe/sdk` | 3.5.1 | 2026-08-27 |
| `@openzeppelin/confidential-contracts` | 0.5.3 | 2026-08-10 |
| `@fhevm/hardhat-plugin` | 0.4.2 | 2026-02-19 |

HCU costs and the 20,000,000 / 5,000,000 limits:
<https://docs.zama.org/protocol/solidity-guides/development-guide/hcu>

## What the product workstream needs back

No new contract surface is requested yet. Two answers shape the UI, and both are
protocol calls:

1. **Final participant cap.** The draw room has to show capacity honestly. If the cap
   is ~20, "Pool full — next draw opens in N" is a first-class UI state, not an edge
   case.
2. **Whether sealing is one transaction or several.** If ADR-002 is superseded by a
   batched design, the draw room needs a determinate progress model
   (`processed / total`) instead of a single pending transaction. Both are designed;
   which one ships is your call.

---

## Appendix — shape expected from `packages/contract-abi`

`packages/contract-abi` is protocol-owned. The web app currently builds against a
placeholder at `packages/contract-abi/src/index.ts` that pins the shape below, so
that screens can be reviewed before a deployment exists. Replace it with generated
output; the app imports nothing else from the package and hand-copies no ABI.

```ts
export type DeployedContract = { address: `0x${string}`; blockCreated: bigint };

export type VeilDeployment = {
  chainId: number;
  pool: DeployedContract;
  confidentialToken: DeployedContract;
  underlyingToken: DeployedContract;
  faucet: DeployedContract;
};

export const deployments: Readonly<Record<number, VeilDeployment>>;
export function requireDeployment(chainId: number): VeilDeployment;
export function hasDeployment(chainId: number): boolean;
```

Generated ABIs should be exported `as const` so viem infers argument and return
types. If the names above do not match the deployment script's output, the
generated names win — this is a placeholder, not a request.

---

## Addendum — 2026-08-27, after reviewing `EncryptedRangeReductionLab.sol`

Two notes on the lab contract, and one correction to Finding 2 above.

**Correction.** Finding 2 lists the multiply-high steps as widen, widen,
multiply. The widening of the random value is unnecessary: `FHE.sol` defines
mixed-width overloads at line 3890 (`mul(euint64, euint128)`) and line 4683
(`mul(euint128, euint64)`). `FHE.mul(randomValue, wideTotal)` as written in the
lab is correct and saves a cast. My original table was built from a narrower grep
and missed them.

**The `T = 0` case now has an answer**, via `FHE.select(hasPositiveTotal, reduced,
FHE.asEuint64(0))`. That closes ADR-003's first acceptance criterion. Worth noting
in the ADR that the guard has to live at this level rather than in the draw
lifecycle, since the contract cannot branch on an encrypted total.

**One micro-optimisation, not a correctness issue.** `FHE.gt(_total,
FHE.asEuint64(0))` uses the non-scalar comparison at 152,000 HCU; the scalar form
`FHE.gt(_total, 0)` is 117,000. Irrelevant in a lab contract, worth having in the
production scan where it runs once per draw.

**On ADR-003's "quantified distribution bias" criterion:** the product workstream
now has an executable proof of the bias bound, not a statistical one. Rather than
sampling, it inverts the multiply-high map and counts preimages exactly — each
target receives either `floor(2^64/T)` or `ceil(2^64/T)` of them, which is the
bound stated as an assertion rather than as a confidence interval.

It is in `apps/web/src/domain/__tests__/selection.test.ts`, alongside a boundary
test pinning the half-open interval rule (`sum(j<i) <= target < sum(j<=i)`) that
the encrypted scan has to match. Both are small and portable to the reference
model if useful — an off-by-one at that boundary is a silent fairness bug rather
than a visible failure, so it is worth having the assertion on both sides.
