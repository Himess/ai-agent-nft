import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { AuthGate } from "@/components/auth-gate";
import { RaffleClient } from "./raffle-client";

export const metadata: Metadata = {
  title: "The Watchtower — SURVIVORS",
  description:
    "One threshold. A handful of tasks. The top hundred walk by the leaderboard, the next hundred are drawn from those below.",
};

export default async function RafflePage() {
  return (
    <div>
      <Nav />
      <div className="mx-auto max-w-[1040px] px-6 pt-10 md:px-0 md:pt-0">
        <AuthGate>
          <RaffleClient />
        </AuthGate>
      </div>
    </div>
  );
}
