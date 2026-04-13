// src/config/index.ts
// ═══════════════════════════════════════════════════════════════════
// Central config — reads your .env.local and exports everything
// the app needs. If a key is missing, you'll get a clear error.
// ═══════════════════════════════════════════════════════════════════

// ─── LI.FI Earn API ──────────────────────────────────────────────
export const LIFI_INTEGRATOR_ID =
  process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || "";

export const LIFI_API_BASE =
  process.env.NEXT_PUBLIC_LIFI_API_BASE || "https://li.fi/v1";

// ─── WalletConnect ───────────────────────────────────────────────
export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

// ─── RPC endpoints ───────────────────────────────────────────────
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";
const infuraId = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID || "";

// Build RPC URLs per chain — falls back to public RPCs if no key
export function getRpcUrl(chain: string): string {
  const ALCHEMY_URLS: Record<string, string> = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
  };

  const INFURA_URLS: Record<string, string> = {
    ethereum: `https://mainnet.infura.io/v3/${infuraId}`,
    arbitrum: `https://arbitrum-mainnet.infura.io/v3/${infuraId}`,
    optimism: `https://optimism-mainnet.infura.io/v3/${infuraId}`,
    polygon: `https://polygon-mainnet.infura.io/v3/${infuraId}`,
  };

  const PUBLIC_RPCS: Record<string, string> = {
    ethereum: "https://eth.llamarpc.com",
    arbitrum: "https://arb1.arbitrum.io/rpc",
    optimism: "https://mainnet.optimism.io",
    base: "https://mainnet.base.org",
    polygon: "https://polygon-rpc.com",
  };

  // Priority: Alchemy → Infura → Public
  if (alchemyKey && ALCHEMY_URLS[chain]) return ALCHEMY_URLS[chain];
  if (infuraId && INFURA_URLS[chain]) return INFURA_URLS[chain];
  return PUBLIC_RPCS[chain] || PUBLIC_RPCS.ethereum;
}

// ─── Validation ──────────────────────────────────────────────────
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!LIFI_INTEGRATOR_ID || LIFI_INTEGRATOR_ID === "your-integrator-id-here") {
    errors.push(
      "Missing NEXT_PUBLIC_LIFI_INTEGRATOR_ID — register at https://li.fi/plans/"
    );
  }

  if (
    !WALLETCONNECT_PROJECT_ID ||
    WALLETCONNECT_PROJECT_ID === "your-walletconnect-project-id-here"
  ) {
    errors.push(
      "Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID — get one at https://cloud.walletconnect.com"
    );
  }

  if (!alchemyKey && !infuraId) {
    // This is a warning, not an error — public RPCs work for demos
    console.warn(
      "[yield-mullet] No Alchemy/Infura key set — using public RPCs (may be slow/rate-limited)"
    );
  }

  return { valid: errors.length === 0, errors };
}
