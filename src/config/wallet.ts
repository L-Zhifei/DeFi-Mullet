// src/config/wallet.ts
// ═══════════════════════════════════════════════════════════════════
// Wallet connection setup using wagmi + RainbowKit
//
// This file wires up:
//   - Supported chains (Ethereum, Arbitrum, Base, Optimism, Polygon)
//   - RPC transports using YOUR Alchemy/Infura keys (or public fallback)
//   - WalletConnect using YOUR project ID
//   - RainbowKit theme
// ═══════════════════════════════════════════════════════════════════

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
} from "wagmi/chains";
import { http } from "wagmi";
import { WALLETCONNECT_PROJECT_ID, getRpcUrl } from "./index";

// ─── Chains the app supports ─────────────────────────────────────
// Add or remove chains here. The Earn API supports 60+, but for a
// hackathon MVP, 5 major chains is plenty.
export const SUPPORTED_CHAINS = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
] as const;

// ─── Wagmi config ────────────────────────────────────────────────
// getDefaultConfig is RainbowKit's helper that sets up wagmi,
// WalletConnect, and injected wallets all in one call.

export const wagmiConfig = getDefaultConfig({
  appName: "yield.mullet",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [mainnet, arbitrum, optimism, base, polygon],

  // Use YOUR RPC keys — getRpcUrl() reads from .env.local
  // and falls back to public RPCs if no key is set.
  transports: {
    [mainnet.id]: http(getRpcUrl("ethereum")),
    [arbitrum.id]: http(getRpcUrl("arbitrum")),
    [optimism.id]: http(getRpcUrl("optimism")),
    [base.id]: http(getRpcUrl("base")),
    [polygon.id]: http(getRpcUrl("polygon")),
  },
});

// ─── Chain name ↔ ID mapping ─────────────────────────────────────
// Useful when the Earn API returns chain names as strings
// but wagmi needs numeric chain IDs.

export const CHAIN_NAME_TO_ID: Record<string, number> = {
  ethereum: mainnet.id,
  arbitrum: arbitrum.id,
  optimism: optimism.id,
  base: base.id,
  polygon: polygon.id,
};

export const CHAIN_ID_TO_NAME: Record<number, string> = Object.fromEntries(
  Object.entries(CHAIN_NAME_TO_ID).map(([name, id]) => [id, name])
);
