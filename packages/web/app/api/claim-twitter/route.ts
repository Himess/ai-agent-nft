import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getSql } from "@/lib/db";

// Bind the authenticated user's wallet to an outstanding agent/collection
// WL pick for the same Twitter handle. The agent posts picks on Twitter
// ahead of mint; the user shows up, signs in with wallet + X, and claims.
//
// GET  /api/claim-twitter   - report whether the session user has picks
// POST /api/claim-twitter   - claim any pending picks matching the session handle
//
// Idempotent: repeat POSTs for an already-claimed pick succeed and return
// the existing binding. Different wallet attempting to claim another
// user's handle's pick is rejected because the handle→wallet binding is
// enforced by user_profiles (one twitter_id per wallet, enforced at SIWE
// + OAuth time).

type PickRow = {
  id: string;
  source: "ashborn_agent" | "survivorsoneth";
  allocation: "gtd" | "fcfs";
  reason: string | null;
  picked_at: Date;
  deadline_at: Date;
  claimed_wallet: string | null;
  claimed_at: Date | null;
  forfeited: boolean;
};

async function findPicks(handle: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, source, allocation, reason,
           picked_at, deadline_at, claimed_wallet, claimed_at, forfeited
      FROM agent_wl_picks
     WHERE twitter_handle = ${handle}
     ORDER BY picked_at ASC
  `) as unknown as PickRow[];
  return rows;
}

function serializePick(row: PickRow) {
  return {
    id: row.id,
    source: row.source,
    allocation: row.allocation,
    reason: row.reason,
    pickedAt: row.picked_at.toISOString(),
    deadlineAt: row.deadline_at.toISOString(),
    claimedWallet: row.claimed_wallet,
    claimedAt: row.claimed_at?.toISOString() ?? null,
    forfeited: row.forfeited,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const wallet = session?.user?.wallet;
  const handle = session?.user?.twitterHandle?.toLowerCase();
  if (!wallet || !handle) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const picks = await findPicks(handle);
  return NextResponse.json({
    handle,
    wallet,
    picks: picks.map(serializePick),
  });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const wallet = session?.user?.wallet;
  const handle = session?.user?.twitterHandle?.toLowerCase();
  if (!wallet || !handle) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const sql = getSql();
  const now = new Date();

  const claimed = (await sql`
    UPDATE agent_wl_picks
       SET claimed_wallet = ${wallet},
           claimed_at     = NOW()
     WHERE twitter_handle = ${handle}
       AND claimed_wallet IS NULL
       AND forfeited       = FALSE
       AND deadline_at    >  ${now}
    RETURNING id, source, allocation, reason,
              picked_at, deadline_at, claimed_wallet, claimed_at, forfeited
  `) as unknown as PickRow[];

  const all = await findPicks(handle);

  return NextResponse.json({
    handle,
    wallet,
    claimed: claimed.map(serializePick),
    picks: all.map(serializePick),
  });
}
