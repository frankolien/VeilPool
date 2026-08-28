import { createFhevmClient, initFhevmRuntime, setFhevmRuntimeConfig } from "@fhevm/sdk/viem";
import { mainnet as fhevmMainnet, sepolia as fhevmSepolia } from "@fhevm/sdk/chains";
import type { TransportKeyPair } from "@fhevm/sdk/actions/decrypt";
import { confidentialPrizePoolAbi, requireDeployment } from "@veil/contract-abi";
import { getPublicClient, getWalletClient } from "@wagmi/core";
import type { Address, Hash, PublicClient, WalletClient } from "viem";
import { DECRYPTION_SESSION_SECONDS } from "@/config/product";
import type { DecryptionResult, DecryptionSession, PoolGateway, TransactionResult, WriteOptions } from "@/domain/pool/gateway";
import type { PoolState, UserState } from "@/domain/pool/types";
import { sealed, type CiphertextHandle } from "@/domain/privacy/confidential";
import { wagmiConfig } from "@/infrastructure/chain/wagmi";
import { confidentialWrapperAbi, erc20Abi } from "./abis";

type FhevmClient = ReturnType<typeof createFhevmClient>;
type FhevmPermit = Awaited<ReturnType<FhevmClient["signLegacyDecryptionPermit"]>>;
type PrivateSession = { public: DecryptionSession; keyPair: TransportKeyPair; permit: FhevmPermit };

// SDK 0.13 requires runtime policy to be installed before any client or WASM
// module is initialised. The setter is idempotent for identical configuration,
// which keeps Fast Refresh safe in development.
setFhevmRuntimeConfig({});

export class ContractPoolGateway implements PoolGateway {
  private readonly deployment;
  private fhevmPromise: Promise<FhevmClient> | null = null;
  private privateSession: PrivateSession | null = null;
  private readonly handleContracts = new Map<CiphertextHandle, Address>();

  constructor(private readonly account: Address, private readonly chainId: number) {
    this.deployment = requireDeployment(chainId);
  }

  async getPoolState(): Promise<PoolState> {
    const client = this.publicClient();
    const pool = this.deployment.pool.address;
    const [drawId, nextDrawAt, drawPeriod, prize, participants, cap, drawState, symbol, name, decimals] = await Promise.all([
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "currentDrawId" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "nextDrawAt" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "drawPeriod" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "prizePerDraw" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "participantCount" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "MAX_PARTICIPANTS" }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "drawState" }),
      client.readContract({ address: this.deployment.confidentialToken.address, abi: confidentialWrapperAbi, functionName: "symbol" }),
      client.readContract({ address: this.deployment.confidentialToken.address, abi: confidentialWrapperAbi, functionName: "name" }),
      client.readContract({ address: this.deployment.confidentialToken.address, abi: confidentialWrapperAbi, functionName: "decimals" }),
    ]);
    const closesAt = Number(nextDrawAt);
    return {
      address: pool,
      asset: {
        underlying: { address: this.deployment.underlyingToken.address, symbol: "USDT", name: "Mock Tether USD", decimals: Number(decimals) },
        confidential: { address: this.deployment.confidentialToken.address, symbol, name, decimals: Number(decimals) },
      },
      draw: { id: Number(drawId), status: Number(drawState) === 1 ? "ready" : "open", opensAt: closesAt - Number(drawPeriod), closesAt, prize, participantCount: Number(participants) },
      // The reserve itself is encrypted. Zero means “not publicly disclosed”, not insolvent.
      prizeReserve: 0n,
      prizeReserveVisibility: "encrypted",
      isDemoReserve: true,
      participantCount: Number(participants),
      participantCap: Number(cap),
    };
  }

  async getUserState(account: Address): Promise<UserState> {
    const client = this.publicClient();
    const pool = this.deployment.pool.address;
    const token = this.deployment.confidentialToken.address;
    const underlying = this.deployment.underlyingToken.address;
    const [underlyingBalance, allowance, confidentialBalance, principal, winnings, registered, eligible, operator] = await Promise.all([
      client.readContract({ address: underlying, abi: erc20Abi, functionName: "balanceOf", args: [account] }),
      client.readContract({ address: underlying, abi: erc20Abi, functionName: "allowance", args: [account, token] }),
      client.readContract({ address: token, abi: confidentialWrapperAbi, functionName: "confidentialBalanceOf", args: [account] }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "encryptedPrincipalOf", args: [account] }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "encryptedWinningsOf", args: [account] }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "registered", args: [account] }),
      client.readContract({ address: pool, abi: confidentialPrizePoolAbi, functionName: "eligibleFromDraw", args: [account] }),
      client.readContract({ address: token, abi: confidentialWrapperAbi, functionName: "isOperator", args: [account, pool] }),
    ]);
    const confidentialHandle = confidentialBalance as CiphertextHandle;
    const principalHandle = principal as CiphertextHandle;
    const winningsHandle = winnings as CiphertextHandle;
    this.rememberHandle(confidentialHandle, token);
    this.rememberHandle(principalHandle, pool);
    this.rememberHandle(winningsHandle, pool);
    return {
      address: account, underlyingBalance, wrapperAllowance: allowance,
      confidentialBalance: sealed(confidentialHandle),
      principal: sealed(principalHandle),
      unclaimedWinnings: sealed(winningsHandle),
      isParticipant: registered, eligibleFromDrawId: Number(eligible), hasPoolOperatorApproval: operator,
    };
  }

  mintFromFaucet(amount: bigint, options?: WriteOptions) {
    if (!this.deployment.faucet) throw new Error("This network has no test-token faucet");
    return this.write(this.deployment.faucet.address, erc20Abi, "mint", [this.account, amount], options);
  }
  approveWrapper(amount: bigint, options?: WriteOptions) { return this.write(this.deployment.underlyingToken.address, erc20Abi, "approve", [this.deployment.confidentialToken.address, amount], options); }
  shield(amount: bigint, options?: WriteOptions) { return this.write(this.deployment.confidentialToken.address, confidentialWrapperAbi, "wrap", [this.account, amount], options); }
  async unshield(amount: bigint, options?: WriteOptions) {
    const encrypted = await this.encrypt64(amount, this.deployment.confidentialToken.address, options);
    return this.write(this.deployment.confidentialToken.address, confidentialWrapperAbi, "unwrap", [this.account, this.account, encrypted.handle, encrypted.proof], options);
  }
  setPoolOperator(until: Date, options?: WriteOptions) { return this.write(this.deployment.confidentialToken.address, confidentialWrapperAbi, "setOperator", [this.deployment.pool.address, BigInt(Math.floor(until.getTime() / 1000))], options); }
  async deposit(amount: bigint, options?: WriteOptions) { const e = await this.encrypt64(amount, this.deployment.pool.address, options); return this.write(this.deployment.pool.address, confidentialPrizePoolAbi, "deposit", [e.handle, e.proof], options); }
  async fundPrizeReserve(amount: bigint, options?: WriteOptions) { const e = await this.encrypt64(amount, this.deployment.pool.address, options); return this.write(this.deployment.pool.address, confidentialPrizePoolAbi, "fundPrizeReserve", [e.handle, e.proof], options); }
  async withdraw(amount: bigint, options?: WriteOptions) { const e = await this.encrypt64(amount, this.deployment.pool.address, options); return this.write(this.deployment.pool.address, confidentialPrizePoolAbi, "withdraw", [e.handle, e.proof], options); }
  sealDraw(options?: WriteOptions) { return this.write(this.deployment.pool.address, confidentialPrizePoolAbi, "sealDraw", [], options); }
  claimWinnings(options?: WriteOptions) { return this.write(this.deployment.pool.address, confidentialPrizePoolAbi, "claimWinnings", [], options); }

  async authorizeDecryption(): Promise<DecryptionSession> {
    const now = Math.floor(Date.now() / 1000);
    if (this.privateSession && this.privateSession.public.expiresAt > now) return this.privateSession.public;
    const [fhevm, wallet] = await Promise.all([this.fhevm(), this.walletClient()]);
    const keyPair = await fhevm.generateTransportKeyPair();
    const contracts = [this.deployment.pool.address, this.deployment.confidentialToken.address] as const;
    const permit = await fhevm.signLegacyDecryptionPermit({ contractAddresses: contracts, startTimestamp: now, durationSeconds: DECRYPTION_SESSION_SECONDS, signerAddress: this.account, signer: wallet, transportKeyPair: keyPair });
    const publicSession = { contracts, expiresAt: now + DECRYPTION_SESSION_SECONDS };
    this.privateSession = { public: publicSession, keyPair, permit };
    return publicSession;
  }

  async decrypt(handles: readonly CiphertextHandle[], session: DecryptionSession): Promise<DecryptionResult> {
    const active = this.privateSession;
    if (!active || active.public !== session || session.expiresAt <= Math.floor(Date.now() / 1000)) throw new Error("Decryption session expired");
    const fhevm = await this.fhevm();
    const values = await fhevm.decryptValuesFromPairs({
      pairs: handles.map((handle) => ({
        encryptedValue: handle,
        contractAddress: this.handleContracts.get(handle) ?? this.deployment.pool.address,
      })),
      transportKeyPair: active.keyPair,
      signedPermit: active.permit,
    });
    return new Map(handles.map((handle, index) => [handle, BigInt(values[index]!.value as bigint | number | string)]));
  }

  private publicClient(): PublicClient {
    const client = getPublicClient(wagmiConfig, { chainId: this.chainId as 1 | 11_155_111 });
    if (!client) throw new Error(`RPC unavailable for chain ${this.chainId}`);
    return client as PublicClient;
  }
  private rememberHandle(handle: CiphertextHandle, contract: Address): void {
    if (!/^0x0{64}$/.test(handle)) this.handleContracts.set(handle, contract);
  }
  private async walletClient(): Promise<WalletClient> {
    const client = await getWalletClient(wagmiConfig, { chainId: this.chainId as 1 | 11_155_111 });
    if (!client || client.account?.address.toLowerCase() !== this.account.toLowerCase()) throw new Error("Wallet disconnected");
    return client as WalletClient;
  }
  private async fhevm(): Promise<FhevmClient> {
    this.fhevmPromise ??= (async () => {
      await initFhevmRuntime();
      return createFhevmClient({
        publicClient: this.publicClient(),
        chain: this.chainId === 1 ? fhevmMainnet : fhevmSepolia,
      });
    })();
    return this.fhevmPromise;
  }
  private async encrypt64(amount: bigint, contractAddress: Address, options?: WriteOptions) {
    options?.signal?.throwIfAborted(); options?.report?.("encrypting");
    const result = await (await this.fhevm()).encryptValue({ value: { type: "euint64", value: amount }, contractAddress, userAddress: this.account });
    return { handle: result.encryptedValue as `0x${string}`, proof: result.inputProof as `0x${string}` };
  }
  private async write(address: Address, abi: readonly unknown[], functionName: string, args: readonly unknown[], options?: WriteOptions): Promise<TransactionResult> {
    options?.signal?.throwIfAborted(); options?.report?.("awaiting-wallet");
    const wallet = await this.walletClient();
    const client = this.publicClient();
    const request = await client.simulateContract({ account: this.account, address, abi, functionName, args });
    const hash = await wallet.writeContract(request.request as never) as Hash;
    options?.report?.("confirming");
    const receipt = await client.waitForTransactionReceipt({ hash });
    options?.report?.("refreshing");
    return { hash, blockNumber: receipt.blockNumber };
  }
}
