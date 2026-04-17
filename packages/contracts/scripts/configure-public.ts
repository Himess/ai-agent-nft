/**
 * Configure the public stage on the SeaDrop-wired AgentNFT.
 *
 * Usage:
 *   NFT_ADDRESS=0x...                   \
 *   PUBLIC_START=2026-05-01T19:00:00Z   \
 *   PUBLIC_END=2026-05-02T19:00:00Z     \
 *   npx hardhat run scripts/configure-public.ts --network sepolia
 */
import { publicDrop } from "../config/drop-config";
import { configurePublicStage, parseUnixTimestamp, requireEnv } from "./lib/stage";

async function main() {
  const nftAddress = requireEnv("NFT_ADDRESS");
  const start = parseUnixTimestamp(requireEnv("PUBLIC_START"), "PUBLIC_START");
  const end = parseUnixTimestamp(requireEnv("PUBLIC_END"), "PUBLIC_END");

  const drop = publicDrop({ startTime: start, endTime: end });

  console.log("━━━ Configuring Public stage ━━━");
  await configurePublicStage(nftAddress, drop);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
