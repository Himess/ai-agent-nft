/**
 * Configure the FCFS presale stage on the SeaDrop-wired AgentNFT.
 *
 * Usage:
 *   NFT_ADDRESS=0x...                 \
 *   FCFS_ADDRESSES=allowlists/fcfs.txt \
 *   FCFS_START=2026-05-01T18:30:00Z   \
 *   FCFS_END=2026-05-01T19:00:00Z     \
 *   FCFS_URI=ipfs://...               \  # optional
 *   npx hardhat run scripts/configure-fcfs.ts --network sepolia
 */
import { fcfsMintParams } from "../config/drop-config";
import {
  configureAllowListStage,
  parseUnixTimestamp,
  readAddressList,
  requireEnv,
} from "./lib/stage";

async function main() {
  const nftAddress = requireEnv("NFT_ADDRESS");
  const listPath = requireEnv("FCFS_ADDRESSES");
  const start = parseUnixTimestamp(requireEnv("FCFS_START"), "FCFS_START");
  const end = parseUnixTimestamp(requireEnv("FCFS_END"), "FCFS_END");
  const allowListURI = process.env.FCFS_URI ?? "";

  const addresses = readAddressList(listPath);
  const params = fcfsMintParams({ startTime: start, endTime: end });

  console.log("━━━ Configuring FCFS stage ━━━");
  await configureAllowListStage(nftAddress, addresses, params, allowListURI);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
