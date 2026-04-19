"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";

// WalletConnect project id is public. A dev placeholder works locally but
// prod must provide a real id from https://cloud.walletconnect.com — set it
// as NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in Vercel env.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "survivors-dev-placeholder";

export const wagmiConfig = getDefaultConfig({
  appName: "SURVIVORS",
  projectId,
  chains: [mainnet, sepolia],
  ssr: true,
});
