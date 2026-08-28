import type { Metadata } from "next";
import { DrawScreen } from "@/features/draws/DrawScreen";
import { PageHeading } from "@/components/PageHeading";

export const metadata: Metadata = {
  title: "Draw room",
  description: "Watch a draw run over encrypted balances. No winner is ever announced.",
};

export default function DrawsPage() {
  return (
    <>
      <PageHeading
        title="Draw room"
        description="Selection runs on-chain over encrypted balances. Nobody — including this page — learns who won."
      />
      <DrawScreen />
    </>
  );
}
