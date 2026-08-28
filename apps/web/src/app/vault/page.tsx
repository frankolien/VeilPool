import type { Metadata } from "next";
import { VaultScreen } from "@/features/pool/VaultScreen";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "Private vault",
  description: "Reveal your own balances and results locally, with one EIP-712 signature.",
};

export default function VaultPage() {
  return (
    <>
      <PageHeading
        title="Private vault"
        description="Everything here is encrypted on-chain. Revealing decrypts it in this browser and nowhere else."
      />
      <VaultScreen />
    </>
  );
}
