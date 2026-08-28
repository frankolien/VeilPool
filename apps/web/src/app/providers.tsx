"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isMockMode } from "@/config/environment";
import { GatewayProvider } from "@/infrastructure/gateway/GatewayProvider";
import { MockConnectionProvider } from "@/infrastructure/wallet/MockConnectionProvider";
import { WagmiConnectionProvider } from "@/infrastructure/wallet/WagmiConnectionProvider";
import { RevealProvider } from "@/features/decrypt/RevealProvider";
import { DemoChecklistProvider } from "@/features/onboarding/DemoChecklistProvider";

/**
 * The provider stack.
 *
 * Order matters and is load-bearing: the connection supplies the account, the
 * gateway is built from it, and the reveal store is cleared whenever it changes.
 *
 * Query defaults are set here rather than per-hook. `retry: false` is deliberate
 * — a failed write must surface a product error immediately, and silently
 * retrying a transaction is the one thing a financial UI must never do.
 */
export function Providers({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            gcTime: 5 * 60 * 1000,
          },
          mutations: { retry: false },
        },
      }),
  );

  const Connection = isMockMode ? MockConnectionProvider : WagmiConnectionProvider;

  return (
    <QueryClientProvider client={queryClient}>
      <Connection>
        <GatewayProvider>
          <RevealProvider>
            <DemoChecklistProvider>{children}</DemoChecklistProvider>
          </RevealProvider>
        </GatewayProvider>
      </Connection>
    </QueryClientProvider>
  );
}
