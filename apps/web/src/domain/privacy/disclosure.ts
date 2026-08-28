/**
 * The standing confidentiality boundary.
 *
 * `receipt.ts` answers "what just happened". This answers "what is true of the
 * protocol at all times", and is what the How-it-works page and the landing page
 * render. Both files describe the same protocol; keeping them separate stops the
 * marketing surface from drifting away from the per-operation truth.
 */

export type DisclosureFact = {
  readonly id: string;
  readonly label: string;
  /** Why this is the case, in one sentence a non-cryptographer can check. */
  readonly because: string;
};

/** Encrypted on-chain. An observer reading the contract sees a ciphertext handle. */
export const PROTECTED_FACTS: readonly DisclosureFact[] = [
  {
    id: "deposit-amount",
    label: "How much you deposited",
    because: "Deposits arrive as a confidential ERC-7984 transfer carrying an encrypted amount.",
  },
  {
    id: "principal",
    label: "Your principal in the pool",
    because: "Per-account principal is stored as euint64 and only you hold the ACL grant for it.",
  },
  {
    id: "total-principal",
    label: "The pool's total principal",
    because: "The total is accumulated homomorphically and is never decrypted on-chain.",
  },
  {
    id: "odds",
    label: "Your odds of winning",
    because: "Odds are your principal over the encrypted total — both sides stay encrypted.",
  },
  {
    id: "target",
    label: "The draw's random target",
    because: "Randomness is generated on-chain as a ciphertext and is never made publicly decryptable.",
  },
  {
    id: "winner",
    label: "Who won",
    because: "Selection runs under encryption and credits an encrypted amount. No winner address is emitted.",
  },
  {
    id: "winnings",
    label: "What you won",
    because: "Unclaimed winnings are an euint64 that only you can decrypt.",
  },
];

/** Readable by anyone. Stated plainly so the product never over-claims. */
export const PUBLIC_FACTS: readonly DisclosureFact[] = [
  {
    id: "participation",
    label: "That your wallet participates",
    because: "Your wallet sends the deposit transaction, and the pool records participants publicly.",
  },
  {
    id: "participant-count",
    label: "How many wallets are in the pool",
    because: "The participant list has to be public for the encrypted scan to enumerate it.",
  },
  {
    id: "timing",
    label: "When you act",
    because: "Block timestamps are public for every transaction on any EVM chain.",
  },
  {
    id: "prize",
    label: "The prize and reserve size",
    because: "Prize liquidity is funded publicly so that solvency can be verified by anyone.",
  },
  {
    id: "schedule",
    label: "The draw schedule and state",
    because: "The draw lifecycle is public so that anyone can verify a draw ran correctly.",
  },
  {
    id: "wrapping",
    label: "Amounts you shield or unshield",
    because: "Wrapping crosses the public ERC-20 boundary, where amounts are visible by definition.",
  },
];

/** Correlations that defeat the protections above. Named, not buried. */
export const INFERENCE_RISKS: readonly DisclosureFact[] = [
  {
    id: "wrap-deposit",
    label: "Shielding then immediately depositing",
    because: "The public wrap amount and the following deposit are adjacent in time and likely equal.",
  },
  {
    id: "withdraw-unwrap",
    label: "Withdrawing then immediately unshielding",
    because: "The public unwrap amount reveals what the private withdrawal was worth.",
  },
  {
    id: "claim-timing",
    label: "Claiming soon after a draw",
    because: "Claiming is a public call, so a claim right after a draw suggests that wallet won it.",
  },
  {
    id: "small-anonymity-set",
    label: "A pool with few participants",
    because: "Encryption hides amounts, not membership. With few wallets, elimination is easy.",
  },
];
