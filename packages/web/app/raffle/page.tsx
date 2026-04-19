import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { RaffleClient } from "./raffle-client";

export const metadata: Metadata = {
  title: "The Watchtower — SURVIVORS",
  description:
    "Three thresholds. Ten tasks. One hundred walk by the leaderboard, one hundred more are drawn from those below.",
};

export default function RafflePage() {
  return (
    <div>
      <Nav />
      <RaffleClient />
    </div>
  );
}
