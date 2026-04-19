// Wallet-score pipeline — NFT-weighted (24pts) + activity (6pts) = 30pts total.
// Fed to the final WL ranking alongside the agent's 0-70 read of quiz +
// application answers. Data comes from Alchemy's free tier — enough for the
// pre-launch traffic shape we expect.

// ─── Blue-chip list ──────────────────────────────────────────
// Curated 15. User-confirmed.

export interface BlueChip {
  name: string;
  contract: string;           // checksum address
  roughFloorUsd: number;      // rough floor estimate in USD, updated manually.
}

export const BLUE_CHIPS: BlueChip[] = [
  { name: "BAYC",              contract: "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D", roughFloorUsd: 60000 },
  { name: "MAYC",              contract: "0x60E4d786628Fea6478F785A6d7e704777c86a7c6", roughFloorUsd: 8500 },
  { name: "Azuki",             contract: "0xED5AF388653567Af2F388E6224dC7C4b3241C544", roughFloorUsd: 14000 },
  { name: "CryptoPunks",       contract: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", roughFloorUsd: 50000 },
  { name: "Doodles",           contract: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", roughFloorUsd: 2500 },
  { name: "Pudgy Penguins",    contract: "0xBd3531dA5CF5857e7CfAA92426877b022e612cf8", roughFloorUsd: 18000 },
  { name: "CloneX",            contract: "0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B", roughFloorUsd: 2000 },
  { name: "Moonbirds",         contract: "0x23581767a106ae21c074b2276D25e5C3e136a68b", roughFloorUsd: 3200 },
  { name: "Miladys",           contract: "0x5Af0D9827E0c53E4799BB226655A1de152A425a5", roughFloorUsd: 6000 },
  { name: "Otherdeeds",        contract: "0x34d85c9CDeB23FA97cb08333b511ac86E1C4E258", roughFloorUsd: 700 },
  { name: "Fidenza",           contract: "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270", roughFloorUsd: 80000 },
  { name: "Chromie Squiggle",  contract: "0x059EDD72Cd353dF5106D2B9cC5ab83a52287aC3a", roughFloorUsd: 40000 },
  { name: "DeGods",            contract: "0x8821BeE2ba0dF28761AffF119D66390D594CD280", roughFloorUsd: 3500 },
  { name: "Captainz",          contract: "0x769272677faB02575E84945F03Eca517ACc544Cc", roughFloorUsd: 1500 },
  { name: "Nouns",             contract: "0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03", roughFloorUsd: 20000 },
];

const BLUE_CHIP_SET = new Set(BLUE_CHIPS.map((c) => c.contract.toLowerCase()));
const BLUE_CHIP_BY_ADDRESS = new Map(
  BLUE_CHIPS.map((c) => [c.contract.toLowerCase(), c])
);

// ─── Alchemy endpoints ─────────────────────────────────────

const ALCHEMY_BASE_RPC = "https://eth-mainnet.g.alchemy.com/v2";
const ALCHEMY_BASE_NFT = "https://eth-mainnet.g.alchemy.com/nft/v3";

function apiKey(): string | null {
  return process.env.ALCHEMY_API_KEY?.trim() || null;
}

async function jsonRpc(method: string, params: unknown[]): Promise<unknown> {
  const key = apiKey();
  if (!key) throw new Error("ALCHEMY_API_KEY not configured");
  const res = await fetch(`${ALCHEMY_BASE_RPC}/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`alchemy ${method} ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function nftApi<T>(path: string, query: URLSearchParams): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error("ALCHEMY_API_KEY not configured");
  const res = await fetch(`${ALCHEMY_BASE_NFT}/${key}/${path}?${query}`);
  if (!res.ok) throw new Error(`alchemy ${path} ${res.status}`);
  return (await res.json()) as T;
}

// ─── Data fetchers ───────────────────────────────────────────

async function fetchWalletAgeAndActivity(wallet: string): Promise<{
  ageDays: number;
  txCount: number;
  lastActivityTimestamp: number | null;
}> {
  // Tx count (outgoing) — cheap single RPC call.
  const txCountHex = (await jsonRpc("eth_getTransactionCount", [
    wallet,
    "latest",
  ])) as string;
  const txCount = parseInt(txCountHex, 16) || 0;

  // First + last transfer via alchemy_getAssetTransfers.
  // fromAddress pins it to outgoing activity (what the wallet owner did).
  const transfersRes = (await jsonRpc("alchemy_getAssetTransfers", [
    {
      fromBlock: "0x0",
      fromAddress: wallet,
      category: ["external", "erc20", "erc721", "erc1155"],
      order: "asc",
      maxCount: "0x1",
      withMetadata: true,
    },
  ])) as { transfers?: { metadata?: { blockTimestamp?: string } }[] };

  const firstTs = transfersRes.transfers?.[0]?.metadata?.blockTimestamp;
  const first = firstTs ? new Date(firstTs).getTime() : null;

  const latestRes = (await jsonRpc("alchemy_getAssetTransfers", [
    {
      fromBlock: "0x0",
      fromAddress: wallet,
      category: ["external", "erc20", "erc721", "erc1155"],
      order: "desc",
      maxCount: "0x1",
      withMetadata: true,
    },
  ])) as { transfers?: { metadata?: { blockTimestamp?: string } }[] };
  const lastTs = latestRes.transfers?.[0]?.metadata?.blockTimestamp;
  const lastActivity = lastTs ? new Date(lastTs).getTime() : null;

  const ageMs = first ? Date.now() - first : 0;
  const ageDays = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60 * 24)));

  return { ageDays, txCount, lastActivityTimestamp: lastActivity };
}

async function fetchBlueChipHoldings(wallet: string): Promise<{
  bluechipCount: number;
  bluechipUsdValue: number;
  avgHoldingDays: number;
}> {
  const query = new URLSearchParams();
  query.set("owner", wallet);
  query.set("withMetadata", "true");
  query.set("pageSize", "100");
  for (const chip of BLUE_CHIPS) query.append("contractAddresses[]", chip.contract);

  const data = await nftApi<{
    ownedNfts: {
      contract: { address: string };
      acquiredAt?: { blockTimestamp?: string };
    }[];
  }>("getNFTsForOwner", query);

  const perContract = new Map<string, number>();
  const holdingDays: number[] = [];
  for (const nft of data.ownedNfts ?? []) {
    const addr = nft.contract.address.toLowerCase();
    if (!BLUE_CHIP_SET.has(addr)) continue;
    perContract.set(addr, (perContract.get(addr) ?? 0) + 1);
    const ts = nft.acquiredAt?.blockTimestamp;
    if (ts) {
      const days = Math.floor(
        (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (days >= 0) holdingDays.push(days);
    }
  }

  let usdValue = 0;
  for (const [addr, count] of perContract) {
    const chip = BLUE_CHIP_BY_ADDRESS.get(addr);
    if (!chip) continue;
    usdValue += chip.roughFloorUsd * count;
  }

  const avgHoldingDays = holdingDays.length
    ? Math.round(holdingDays.reduce((a, b) => a + b, 0) / holdingDays.length)
    : 0;

  return {
    bluechipCount: perContract.size,
    bluechipUsdValue: Math.round(usdValue),
    avgHoldingDays,
  };
}

// ─── Scoring ────────────────────────────────────────────────
// Total 30 pts = NFT 24 pts (80%) + activity 6 pts (20%).

function nftValuePts(usd: number): number {
  if (usd >= 50000) return 12;
  if (usd >= 10000) return 10;
  if (usd >= 1000) return 7;
  if (usd >= 100) return 3;
  return 0;
}

function blueChipCountPts(n: number): number {
  if (n >= 4) return 7;
  if (n >= 2) return 5;
  if (n >= 1) return 3;
  return 0;
}

function avgHoldingPts(days: number): number {
  if (days >= 365) return 5;
  if (days >= 180) return 4;
  if (days >= 90) return 3;
  if (days >= 30) return 2;
  return 0;
}

function walletAgePts(days: number): number {
  if (days >= 365 * 2) return 3;
  if (days >= 365) return 2;
  if (days >= 90) return 1;
  return 0;
}

function txCountPts(count: number): number {
  if (count >= 1000) return 2;
  if (count >= 100) return 1;
  return 0;
}

function recentActivityPts(lastActivityMs: number | null): number {
  if (!lastActivityMs) return 0;
  const days = (Date.now() - lastActivityMs) / (1000 * 60 * 60 * 24);
  if (days <= 30) return 1;
  return 0;
}

export interface WalletScoreBreakdown {
  score: number;
  walletAgeDays: number;
  txCount: number;
  nftUsdValue: number;
  bluechipCount: number;
  avgHoldingDays: number;
  lastActivityAt: Date | null;
}

export async function computeWalletScore(
  wallet: string
): Promise<WalletScoreBreakdown> {
  const addr = wallet.toLowerCase();

  const [activity, holdings] = await Promise.all([
    fetchWalletAgeAndActivity(addr),
    fetchBlueChipHoldings(addr),
  ]);

  const score =
    nftValuePts(holdings.bluechipUsdValue) +
    blueChipCountPts(holdings.bluechipCount) +
    avgHoldingPts(holdings.avgHoldingDays) +
    walletAgePts(activity.ageDays) +
    txCountPts(activity.txCount) +
    recentActivityPts(activity.lastActivityTimestamp);

  return {
    score,
    walletAgeDays: activity.ageDays,
    txCount: activity.txCount,
    nftUsdValue: holdings.bluechipUsdValue,
    bluechipCount: holdings.bluechipCount,
    avgHoldingDays: holdings.avgHoldingDays,
    lastActivityAt: activity.lastActivityTimestamp
      ? new Date(activity.lastActivityTimestamp)
      : null,
  };
}
