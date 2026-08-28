/**
 * The generated contract integration boundary.
 *
 * OWNERSHIP: this package belongs to the protocol workstream (see AGENTS.md).
 * The file below is a product-authored *placeholder* that pins the shape the web
 * app consumes, so that the app can be built and reviewed before deployment. It
 * is expected to be replaced wholesale by generated output.
 *
 * The app must never hand-copy an ABI or an address. Everything it needs comes
 * from here, and in `sepolia` mode a missing deployment fails loudly at boot
 * rather than rendering an empty pool.
 */

export type DeployedContract = {
  readonly address: `0x${string}`;
  /** Known for VEIL-owned deployments; omitted for externally deployed assets. */
  readonly blockCreated?: bigint;
};

export type VeilDeployment = {
  readonly chainId: number;
  readonly pool: DeployedContract;
  readonly confidentialToken: DeployedContract;
  readonly underlyingToken: DeployedContract;
  /** Test networks may expose a mintable underlying token. Mainnet never does. */
  readonly faucet?: DeployedContract;
};

export { confidentialPrizePoolAbi } from "./abi.generated";

/**
 * Deployments keyed by chain id, populated by generation.
 *
 * Empty until the protocol workstream deploys. `requireDeployment` is the only
 * supported accessor so that the failure is a clear message instead of an
 * `undefined` propagating into a screen.
 */
export const deployments: Readonly<Record<number, VeilDeployment>> = {
  11155111: {
    chainId: 11155111,
    pool: {
      address: "0x46586569269A86A362E8814531543CAfc6972Baf",
      blockCreated: 11578519n,
    },
    confidentialToken: {
      address: "0x4E7B06D78965594eB5EF5414c357ca21E1554491",
    },
    underlyingToken: {
      address: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    },
    // Zama's Sepolia mock USDT exposes its own public mint function.
    faucet: {
      address: "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0",
    },
  },
};

export function requireDeployment(chainId: number): VeilDeployment {
  const deployment = deployments[chainId];
  if (!deployment) {
    throw new Error(
      `No VEIL Pool deployment for chain ${chainId}. ` +
        `Run the protocol workstream's deploy + ABI generation, or set NEXT_PUBLIC_VEIL_MODE=mock.`,
    );
  }
  return deployment;
}

export function hasDeployment(chainId: number): boolean {
  return chainId in deployments;
}
