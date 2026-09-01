# VEIL Pool

VEIL Pool is a confidential prize-linked stablecoin savings protocol built on
Zama FHEVM. Users keep ownership of their principal while encrypted,
deposit-weighted draws allocate prizes without publishing balances, odds, or a
winner address.

The production contract is live on Sepolia. Ethereum support is readiness-gated
until a reviewed pool deployment is registered.

**Live app:** [veil-pool.vercel.app](https://veil-pool.vercel.app)

## Engineering workspaces

- `packages/reference-model`: executable mathematical model and property tests
- `packages/contracts`: FHEVM contracts and contract tests
- `packages/contract-abi`: generated frontend integration boundary
- `apps/web`: consumer application
- `docs/protocol`: protocol specification and algorithms
- `docs/security`: threat model and verification plan
- `docs/decisions`: architectural decision records

## Current gate

The weighted encrypted selection algorithm and its range-reduction bounds are
implemented and tested. The deployed Sepolia pool passes the read-only preflight
and post-deployment smoke checks. The only protocol release gate still open is a
recorded two-wallet lifecycle: deposit, draw, private result, claim, and both
principal withdrawals. Ethereum remains deliberately readiness-gated and is not
part of the bounty release.

### Sepolia deployment

- Pool: [`0x4658…2Baf`](https://sepolia.etherscan.io/address/0x46586569269A86A362E8814531543CAfc6972Baf)
- Confidential cUSDT: [`0x4E7B…4491`](https://sepolia.etherscan.io/address/0x4E7B06D78965594eB5EF5414c357ca21E1554491)
- Mock USDT faucet: [`0xa7dA…e9b0`](https://sepolia.etherscan.io/address/0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0)
- Deployment transaction: [`0xfe81…1ca`](https://sepolia.etherscan.io/tx/0xfe81dca6355e2036a92fbb7763da2daee29a698046fb48c52daa6593566701ca)
- Prize per draw: 25 cUSDT from the encrypted demo reserve
- Participant bound: 20 wallets per draw

---

## The product

*Product-workstream sections. The protocol sections above are authoritative for
anything the contracts do.*

### What a user does

Deposit stablecoins into a shared pool. Periodically a draw awards a prize funded
from a separate reserve, weighted by deposit size. Nobody loses principal, and
nobody — including the protocol — can see who saved how much, whose odds are
best, or who won.

The whole lifecycle runs in the browser with no CLI:

`faucet → shield → authorise → deposit → reveal → draw → check result → claim → withdraw`

A guided walkthrough panel tracks that sequence and always names the next action.
Its progress is reconciled against chain state, so reloading does not lose it.

### Screenshots

| | |
| --- | --- |
| ![Landing](docs/product/screenshots/01-landing.png) | ![Protocol explainer](docs/product/screenshots/02-how-it-works.png) |
| The deployed landing page reads the current Sepolia draw directly | The protocol page documents mechanics and the privacy boundary |
| ![Pool entry](docs/product/screenshots/03-pool-sealed.png) | ![Mobile landing](docs/product/screenshots/07-landing-mobile.png) |
| Private values stay unavailable until a wallet connects | The primary journey remains intact on a narrow viewport |

### Running it

The web app ships with an in-memory gateway, so every screen and every flow is
demonstrable without a deployment or a wallet:

```bash
pnpm install
pnpm dev            # http://localhost:3000, defaults to the live Sepolia deployment
```

Mock mode carries a standing, non-dismissible demo-data banner. It cannot be
mistaken for a live pool.

Sepolia is the default runtime. Set `NEXT_PUBLIC_SEPOLIA_RPC_URL` to use a
dedicated RPC; the public Sepolia transport remains available as a fallback.
`NEXT_PUBLIC_MAINNET_RPC_URL` configures the production transport. Ethereum is
shown in the network selector but remains unavailable until a real VEIL pool
deployment is registered; the UI never simulates mainnet readiness.
Set `NEXT_PUBLIC_VEIL_MODE=mock` only for the explicitly labelled local
simulation. The app reads addresses and ABIs only from
`packages/contract-abi` and fails loudly at boot if no deployment is present,
rather than rendering an empty pool.

```bash
pnpm --filter @veil/web typecheck
pnpm --filter @veil/web test
pnpm --filter @veil/web build
pnpm lint
pnpm --filter @veil/contracts-production preflight:sepolia
pnpm --filter @veil/contracts-production smoke:sepolia
```

### Frontend architecture

Four layers, dependencies pointing inward only:

- **`domain/`** — pure TypeScript. Fixed-point money, the confidential-value
  model, the selection algorithm, flow state machines, the error taxonomy, and
  the privacy catalogue. No React, no wagmi, no viem client. Unit-tested
  directly.
- **`infrastructure/`** — adapters. Wallet connection, chain config, and the
  `PoolGateway` implementations. wagmi appears in exactly two files.
- **`features/`** — React modules, one per protocol action.
- **`app/`** — routes, thin.

`PoolGateway` is the seam. Screens are written against it and cannot tell a mock
from a deployment — which is why every flow was demonstrable before a contract
existed, and why the pool-full, reserve-empty and zero-weight states can be
exercised on demand rather than waited for.

The mock gateway runs the *same* weighted-selection algorithm the protocol runs,
in the clear, and reproduces the behaviours that bite: confidential transfers
clamp instead of reverting, deposits are not eligible for the draw they land in,
and the participant cap is enforced.

### Privacy claims

The interface states what leaks with the same prominence as what it protects.
`/how-it-works` carries the full boundary; each operation shows a privacy receipt
with a "visible on-chain" column; and inference risks are surfaced at the moment
the risk is taken — the claim card warns about claim timing *before* the claim
button.

Decrypted values, signatures and decryption keys live in memory only. They are
never written to storage, never placed in a URL, and are cleared on disconnect,
on account change, and on demand. Telemetry receives an error's classification
and nothing else.

### Product documentation

- `docs/product/PRODUCT-BRIEF.md` — thesis, personas, journey, IA, visual
  direction, architecture
- `docs/product/interface-requests/` — requests and research handed to the
  protocol workstream
- `docs/submission/` — demo video script and shot list, X thread draft
- `docs/submission/RELEASE-CHECKLIST.md` — two-wallet rehearsal and evidence log

```mermaid
flowchart TB
    User["👤 User Wallet"]
    Keeper["⚙️ Keeper / Anyone"]
    Funder["🛠 Prize Funder"]
    Token["ERC-7984 cUSDT"]

    subgraph Pool["VEIL Confidential Prize Pool"]
        direction TB

        Registry["Public Registry<br/>participants[0..19]<br/>registered[user]<br/>eligibleFromDraw[user]"]

        subgraph EncryptedState["🔐 Encrypted State"]
            Principal["principal[user]<br/>euint64"]
            Winnings["winnings[user]<br/>euint64"]
            Total["totalPrincipal<br/>euint64"]
            Eligible["eligibleTotalPrincipal<br/>euint64"]
            Reserve["prizeReserve<br/>euint64"]
        end

        subgraph PublicState["Public State"]
            DrawId["currentDrawId"]
            DrawTime["nextDrawAt"]
            Prize["prizePerDraw"]
            Pauses["deposit / draw pauses"]
        end

        subgraph DrawAlgorithm["Weighted FHE Draw"]
            Random["R ← FHE.randEuint64()"]
            Scale["target = high64(R × eligibleTotal)"]
            Scan["Encrypted prefix scan<br/>cumulative += principal[i]"]
            Compare["winsᵢ =<br/>prefixᵢ ≤ target &lt; prefixᵢ₊₁"]
            Credit["winnings[i] +=<br/>FHE.select(winsᵢ, prize, 0)"]
        end
    end

    User -->|"1. Authorize pool operator"| Token
    User -->|"2. Encrypt deposit amount"| Pool
    Pool -->|"3. confidentialTransferFrom"| Token
    Token -->|"Actual transferred ciphertext"| Principal
    Principal --> Total
    Principal --> Eligible
    Registry -.->|"New users eligible next draw"| Eligible

    Funder -->|"Fund encrypted prize reserve"| Pool
    Pool -->|"confidentialTransferFrom"| Token
    Token --> Reserve

    Keeper -->|"sealDraw() after deadline"| Random
    Eligible --> Scale
    Random --> Scale
    Scale --> Scan
    Principal --> Scan
    Registry --> Scan
    Scan --> Compare
    Compare --> Credit
    Reserve --> Credit
    Credit --> Winnings

    User -->|"Decrypt privately via EIP-712"| Principal
    User -->|"Decrypt privately via EIP-712"| Winnings

    User -->|"claimWinnings()"| Winnings
    Winnings -->|"Encrypted confidential transfer"| Token
    Token --> User

    User -->|"withdraw(encrypted amount)"| Principal
    Principal -->|"Valid amount or encrypted zero"| Token
    Token --> User

    style EncryptedState fill:#201b35,stroke:#a78bfa,color:#ffffff
    style DrawAlgorithm fill:#142b2b,stroke:#2dd4bf,color:#ffffff
    style PublicState fill:#302611,stroke:#fbbf24,color:#ffffff
    style Token fill:#172554,stroke:#60a5fa,color:#ffffff
    style User fill:#3b1727,stroke:#fb7185,color:#ffffff
```
