import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { AuthGate } from "@/components/auth-gate";
import { RaffleClient } from "./raffle-client";

export const metadata: Metadata = {
  title: "The Watchtower · SURVIVORS",
  description:
    "Ashborn watches. Applications, trial, and giveaways decide the order.",
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
