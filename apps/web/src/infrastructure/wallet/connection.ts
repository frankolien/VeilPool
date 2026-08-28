import type { Address } from "viem";

/**
 * The wallet surface the product depends on.
 *
 * Screens never import wagmi. They ask this interface whether there is an
 * account and whether it is on the right chain — which is all the product
 * actually needs, and which lets mock mode present a working demo with no
 * wallet installed.
 */
export type ConnectionState = {
  readonly address: Address | null;
  readonly isConnected: boolean;
  readonly chainId: number | null;
  readonly isCorrectChain: boolean;
  readonly isConnecting: boolean;
};

export type ConnectionActions = {
  readonly connect: () => void;
  readonly disconnect: () => void;
  readonly switchToSepolia: () => void;
  readonly switchChain: (chainId: 1 | 11_155_111) => void;
};

export type Connection = ConnectionState & ConnectionActions;

export const DISCONNECTED: ConnectionState = {
  address: null,
  isConnected: false,
  chainId: null,
  isCorrectChain: false,
  isConnecting: false,
};

/**
 * The account mock mode connects.
 *
 * Deliberately recognisable rather than a plausible-looking address, so nobody
 * mistakes a demo session for a real one.
 */
export const MOCK_ACCOUNT = "0xDe000000000000000000000000000000000eA000" as Address;
