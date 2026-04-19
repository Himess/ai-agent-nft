"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// WalletConnect project id is public. A dev placeholder works locally but
// prod must provide a real id from https://cloud.walletconnect.com — set it
// as NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in Vercel env.
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  "survivors-dev-placeholder";

// Wagmi's default public RPC (eth.merkle.io) blocks browser CORS preflight,
// which cascades into SIWE sign failures because RainbowKit can't resolve
// chain reads during the auth handshake. Pin to CORS-friendly endpoints.
// If NEXT_PUBLIC_ALCHEMY_API_KEY is set, prefer it for lower latency + no
// shared-quota throttling.
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const mainnetRpc = alchemyKey
  ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : "https://cloudflare-eth.com";
const sepoliaRpc = alchemyKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
  : "https://ethereum-sepolia-rpc.publicnode.com";

export const wagmiConfig = getDefaultConfig({
  appName: "SURVIVORS",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(mainnetRpc),
    [sepolia.id]: http(sepoliaRpc),
  },
  ssr: true,
});
