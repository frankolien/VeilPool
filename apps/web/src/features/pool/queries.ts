"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import type { Address } from "viem";
import type { PoolState, UserState } from "@/domain/pool/types";
import { useConnection } from "@/infrastructure/wallet/context";
import { useOptionalGateway } from "@/infrastructure/gateway/GatewayProvider";

/**
 * Chain reads.
 *
 * Pool state is polled because the draw countdown and the sealing progress move
 * without any action from this user. User state is not polled: it changes only
 * when this user acts, and every write invalidates it explicitly. Polling it
 * would burn RPC budget to re-fetch ciphertext handles that have not moved.
 */

export const poolKeys = {
  pool: (chainId: number | null) => ["pool", chainId] as const,
  user: (chainId: number | null, account: Address | null) => ["pool", chainId, "user", account] as const,
};

const POOL_POLL_MS = 5_000;

export function usePoolState(): UseQueryResult<PoolState> {
  const gateway = useOptionalGateway();
  const { chainId } = useConnection();

  return useQuery({
    queryKey: poolKeys.pool(chainId),
    queryFn: () => {
      if (!gateway) throw new Error("No gateway");
      return gateway.getPoolState();
    },
    enabled: gateway !== null,
    refetchInterval: POOL_POLL_MS,
    staleTime: POOL_POLL_MS / 2,
  });
}

export function useUserState(): UseQueryResult<UserState> {
  const gateway = useOptionalGateway();
  const { address, chainId } = useConnection();

  return useQuery({
    queryKey: poolKeys.user(chainId, address),
    queryFn: () => {
      if (!gateway || !address) throw new Error("No gateway or account");
      return gateway.getUserState(address);
    },
    enabled: gateway !== null && address !== null,
  });
}

/**
 * Re-reads everything after a write.
 *
 * Returns once the refetch settles so that a flow's `refresh` step ends when the
 * UI is genuinely current, rather than optimistically a moment earlier.
 */
export function useRefreshPool(): () => Promise<void> {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["pool"] });
    await queryClient.invalidateQueries({ queryKey: ["pool", "user"] });
  }, [queryClient]);
}
