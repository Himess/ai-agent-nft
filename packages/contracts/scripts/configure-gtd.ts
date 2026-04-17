/**
 * Configure the GTD (Guaranteed) presale stage on the SeaDrop-wired AgentNFT.
 *
 * Usage:
 *   NFT_ADDRESS=0x...                \
 *   GTD_ADDRESSES=allowlists/gtd.txt \
 *   GTD_START=2026-05-01T18:00:00Z   \
 *   GTD_END=2026-05-01T18:30:00Z     \
 *   GTD_URI=ipfs://...               \  # optional
 *   npx hardhat run scripts/configure-gtd.ts --network sepolia
 */
import { gtdMintParams } from "../config/drop-config";
import {
  configureAllowListStage,
  parseUnixTimestamp,
  readAddressList,
  requireEnv,
} from "./lib/stage";

async function main() {
  const nftAddress = requireEnv("NFT_ADDRESS");
  const listPath = requireEnv("GTD_ADDRESSES");
  const start = parseUnixTimestamp(requireEnv("GTD_START"), "GTD_START");
  const end = parseUnixTimestamp(requireEnv("GTD_END"), "GTD_END");
  const allowListURI = process.env.GTD_URI ?? "";

  const addresses = readAddressList(listPath);
  const params = gtdMintParams({ startTime: start, endTime: end });

  console.log("━━━ Configuring GTD stage ━━━");
  await configureAllowListStage(nftAddress, addresses, params, allowListURI);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
