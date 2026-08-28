/**
 * Privacy receipts.
 *
 * After an operation the user is told exactly what stayed private and what an
 * observer can now see. The catalogue below is written against actual protocol
 * behaviour: an entry that cannot be justified from the contract does not belong
 * here. Marketing lines in a privacy receipt are worse than no receipt, because
 * they teach the user to trust a claim the protocol does not make.
 *
 * Where an operation leaks by construction — shielding publishes an ERC-20
 * amount — the receipt says so first, in the same voice as the protections.
 */

export type ProtocolOperation =
  | "faucet"
  | "approve"
  | "shield"
  | "unshield"
  | "deposit"
  | "fund-prize"
  | "withdraw"
  | "seal-draw"
  | "claim"
  | "decrypt";

export type PrivacyReceipt = {
  readonly operation: ProtocolOperation;
  readonly title: string;
  /** Facts the protocol keeps encrypted through this operation. */
  readonly protected: readonly string[];
  /** Facts any observer can read from the chain after this operation. */
  readonly publicMetadata: readonly string[];
  /**
   * Correlations an observer may draw from this operation combined with others.
   * Present only where a real inference exists.
   */
  readonly inference?: readonly string[];
};

const WALLET_IS_PUBLIC = "The wallet address that sent the transaction";
const TIMING_IS_PUBLIC = "The block timestamp of the transaction";
const GAS_IS_PUBLIC = "Gas used, which is visible to anyone reading the chain";

export const PRIVACY_RECEIPTS: Readonly<Record<ProtocolOperation, PrivacyReceipt>> = {
  faucet: {
    operation: "faucet",
    title: "Test tokens minted",
    protected: [],
    publicMetadata: [
      "The amount of mock USDT minted — this is a public ERC-20 transfer",
      WALLET_IS_PUBLIC,
      TIMING_IS_PUBLIC,
    ],
    inference: ["Faucet mints are public and are not intended to be private."],
  },

  approve: {
    operation: "approve",
    title: "Wrapper approved",
    protected: [],
    publicMetadata: [
      "The approved allowance amount — this is a public ERC-20 approval",
      WALLET_IS_PUBLIC,
      TIMING_IS_PUBLIC,
    ],
  },

  shield: {
    operation: "shield",
    title: "USDT shielded into cUSDT",
    protected: [
      "Every later transfer of the resulting cUSDT balance",
      "Your cUSDT balance once it is held confidentially",
    ],
    publicMetadata: [
      "The shielded amount — wrapping moves a public ERC-20 amount and is visible",
      WALLET_IS_PUBLIC,
      TIMING_IS_PUBLIC,
    ],
    inference: [
      "A shield immediately followed by a pool deposit lets an observer correlate the two amounts. Depositing cUSDT you already held is stronger.",
    ],
  },

  unshield: {
    operation: "unshield",
    title: "cUSDT unshielded into USDT",
    protected: ["Your remaining confidential cUSDT balance"],
    publicMetadata: [
      "The unshielded amount — unwrapping settles into a public ERC-20 transfer",
      WALLET_IS_PUBLIC,
      TIMING_IS_PUBLIC,
    ],
    inference: [
      "A pool withdrawal immediately followed by an unshield lets an observer infer the withdrawn amount.",
    ],
  },

  deposit: {
    operation: "deposit",
    title: "Deposited privately",
    protected: [
      "The deposited amount",
      "Your resulting principal in the pool",
      "Your share of the pool, and therefore your odds",
      "The pool's total principal",
    ],
    publicMetadata: [
      "That this wallet is a pool participant",
      TIMING_IS_PUBLIC,
      "The pool contract that was called",
      GAS_IS_PUBLIC,
    ],
    inference: [
      "Participation itself is public — the wallet called the pool. Only the amounts are encrypted.",
    ],
  },

  "fund-prize": {
    operation: "fund-prize",
    title: "Prize reserve funded privately",
    protected: [
      "The amount added to the prize reserve",
      "The remaining confidential balance in the funding wallet",
      "The pool's resulting prize reserve",
    ],
    publicMetadata: [
      "That this wallet funded the prize reserve",
      TIMING_IS_PUBLIC,
      GAS_IS_PUBLIC,
    ],
    inference: [
      "Funding is public participation, but the contributed amount remains encrypted.",
    ],
  },

  withdraw: {
    operation: "withdraw",
    title: "Withdrawn privately",
    protected: [
      "The withdrawn amount",
      "Your remaining principal",
      "The pool's total principal",
    ],
    publicMetadata: [
      "That this wallet withdrew from the pool",
      TIMING_IS_PUBLIC,
      GAS_IS_PUBLIC,
    ],
    inference: [
      "Withdrawing and unshielding in quick succession reveals the amount at the public token boundary.",
    ],
  },

  "seal-draw": {
    operation: "seal-draw",
    title: "Draw sealed",
    protected: [
      "The encrypted random target",
      "Every participant's weight in the selection",
      "Which participant was selected",
    ],
    publicMetadata: [
      "That a draw was sealed, and by which wallet",
      "The draw identifier and the prize amount",
      "The number of participants in the draw",
      TIMING_IS_PUBLIC,
    ],
    inference: [
      "Anyone may seal a ready draw. The sealing wallet learns nothing the chain does not already publish.",
    ],
  },

  claim: {
    operation: "claim",
    title: "Winnings claimed",
    protected: ["The claimed amount", "Your remaining unclaimed winnings"],
    publicMetadata: [
      "That this wallet called claim",
      TIMING_IS_PUBLIC,
      GAS_IS_PUBLIC,
    ],
    inference: [
      "Claiming is a public call. A wallet that claims soon after a draw is more likely to have won it — claim timing is the strongest signal in the system.",
    ],
  },

  decrypt: {
    operation: "decrypt",
    title: "Revealed to you only",
    protected: [
      "The decrypted value, which is computed in your browser",
      "Your EIP-712 signature, which is used for this session and not stored remotely",
    ],
    publicMetadata: [
      "Nothing. Decryption is an off-chain request and produces no transaction.",
    ],
  },
};

export function receiptFor(operation: ProtocolOperation): PrivacyReceipt {
  return PRIVACY_RECEIPTS[operation];
}
