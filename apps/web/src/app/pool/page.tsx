import type { Metadata } from "next";
import { PoolDashboard } from "@/features/pool/PoolDashboard";

export const metadata: Metadata = {
  title: "Pool",
  description: "Your private savings position, the current draw, and the deposit flow.",
};

export default function PoolPage() {
  return <PoolDashboard />;
}
