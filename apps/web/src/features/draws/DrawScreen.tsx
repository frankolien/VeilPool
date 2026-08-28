"use client";

import { ConnectGate } from "@/components/ConnectGate";
import { DrawRoom } from "./DrawRoom";

/**
 * The client boundary for the draw room.
 *
 * `ConnectGate` takes a render prop, and a function cannot cross the
 * server/client boundary. Keeping the route file a Server Component preserves
 * its static metadata; interactivity starts here.
 */
export function DrawScreen() {
  return <ConnectGate>{({ pool, user }) => <DrawRoom pool={pool} user={user} />}</ConnectGate>;
}
