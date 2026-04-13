// src/app/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Yield Builder Dashboard — wired to REAL LI.FI Earn API
// Falls back to mock data only if the API is unreachable
// ═══════════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { validateConfig } from "../config";
import {
  useOpportunities,
  usePositions,
  useDeposit,
  CHAIN_NAME_TO_ID,
  type DepositStep,
} from "../hooks/useEarn";
import type { Vault, Position } from "../services/types";

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtUsd = (n: number) => "$" + fmt(n);

const chainOptions = [
  { label: "All", id: undefined },
  { label: "Ethereum", id: 1 },
  { label: "Arbitrum", id: 42161 },
  { label: "Base", id: 8453 },
  { label: "Optimism", id: 10 },
  { label: "Polygon", id: 137 },
];

const tokenOptions = ["All", "USDC", "USDT", "ETH", "USDe", "DAI"];

const riskColors: Record<string, string> = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444", low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

const protocolEmojis: Record<string, string> = {
  morpho: "🔵", aave: "👻", euler: "🟣", pendle: "🔶",
  ethena: "🟡", etherfi: "🌊", compound: "🟢", yearn: "🔷",
};

const STEP_LABELS: Record<DepositStep, string> = {
  idle: "",
  quoting: "Getting quote...",
  "switching-chain": "Switching network...",
  approving: "Approve in wallet...",
  depositing: "Confirm deposit in wallet...",
  success: "Deposit successful!",
  error: "Deposit failed",
};

// ─── Token decimals (for converting user input to smallest unit) ─
const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6, USDT: 6, DAI: 18, ETH: 18, WETH: 18, USDe: 18,
};

function toSmallestUnit(amount: string, token: string): string {
  const decimals = TOKEN_DECIMALS[token?.toUpperCase()] ?? 18;
  const num = parseFloat(amount);
  if (isNaN(num)) return "0";
  return BigInt(Math.floor(num * 10 ** decimals)).toString();
}

// ─── Helper to extract display values from a Vault object ────────
// Your friend's Vault type may have nested fields — adjust these
// accessors if the field names differ slightly.
function getVaultDisplay(vault: any) {
  const protoName = typeof vault.protocol === "string"
    ? vault.protocol
    : vault.protocol?.name || vault.protocolName || "Unknown";
  const apy = typeof vault.apy === "number" ? vault.apy : vault.apyBase ?? 0;

  return {
    id: vault.address || vault.id || String(Math.random()),
    protocol: protoName,
    chain: vault.chainName || vault.chain || "Unknown",
    chainId: vault.chainId || 1,
    token: vault.asset || vault.token || vault.depositToken || "USDC",
    apy: apy,
    tvl: vault.tvlUsd ?? vault.tvl ?? 0,
    risk: vault.risk || (apy > 15 ? "High" : apy > 8 ? "Medium" : "Low"),
    address: vault.address || "",
    logo: protocolEmojis[protoName.toLowerCase()] || "⚡",
  };
}

// ─── Mock data (fallback if API is not reachable) ────────────────
const MOCK_VAULTS = [
  { address: "0x1", protocol: "Morpho", chainName: "Arbitrum", chainId: 42161, asset: "USDC", apy: 8.42, tvlUsd: 142500000, risk: "Low" },
  { address: "0x2", protocol: "Aave", chainName: "Ethereum", chainId: 1, asset: "ETH", apy: 3.21, tvlUsd: 890000000, risk: "Low" },
  { address: "0x3", protocol: "Euler", chainName: "Base", chainId: 8453, asset: "USDC", apy: 11.07, tvlUsd: 58200000, risk: "Medium" },
  { address: "0x4", protocol: "Pendle", chainName: "Arbitrum", chainId: 42161, asset: "ETH", apy: 14.55, tvlUsd: 34100000, risk: "Medium" },
  { address: "0x5", protocol: "Ethena", chainName: "Ethereum", chainId: 1, asset: "USDe", apy: 22.30, tvlUsd: 210000000, risk: "High" },
  { address: "0x6", protocol: "EtherFi", chainName: "Ethereum", chainId: 1, asset: "ETH", apy: 4.88, tvlUsd: 420000000, risk: "Low" },
  { address: "0x7", protocol: "Morpho", chainName: "Base", chainId: 8453, asset: "USDC", apy: 9.15, tvlUsd: 67300000, risk: "Low" },
  { address: "0x8", protocol: "Aave", chainName: "Optimism", chainId: 10, asset: "USDT", apy: 5.63, tvlUsd: 125800000, risk: "Low" },
] as any[];

// ─── Config warning banner ───────────────────────────────────────
function ConfigWarning() {
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    const { errors: errs } = validateConfig();
    setErrors(errs);
  }, []);
  if (errors.length === 0) return null;
  return (
    <div style={{ background: "#1c1007", border: "1px solid #f59e0b", borderRadius: 12, padding: "16px 24px", margin: "16px 32px" }}>
      <div style={{ fontWeight: 700, color: "#f59e0b", marginBottom: 8, fontSize: 14 }}>⚠️ Setup needed — check your .env.local</div>
      {errors.map((e, i) => <div key={i} style={{ fontSize: 13, color: "#d4a34a", marginBottom: 4 }}>• {e}</div>)}
      <div style={{ fontSize: 12, color: "#8a7040", marginTop: 8 }}>The app will use mock data until these are configured.</div>
    </div>
  );
}

// ─── Deposit Modal ───────────────────────────────────────────────
function DepositModal({ vault, onClose, onSuccess }: { vault: any; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const { deposit, step, error, txHash, reset } = useDeposit();
  const { isConnected } = useAccount();

  const display = getVaultDisplay(vault);
  const estimatedMonthlyYield = amount ? ((parseFloat(amount) * (display.apy / 100)) / 12).toFixed(2) : "0.00";

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    const smallestUnit = toSmallestUnit(amount, display.token);
    // For the fromTokenAddress, we'd ideally look this up — for now pass a placeholder
    // The Composer API may accept the token symbol or the vault knows the deposit token
    await deposit(vault, smallestUnit, vault.depositTokenAddress || vault.tokenAddress || "");
  };

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => { onSuccess(); onClose(); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const isProcessing = ["quoting", "switching-chain", "approving", "depositing"].includes(step);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 16, padding: 32, width: 420, maxWidth: "90vw" }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Deposit into {display.protocol}</div>
        <div style={{ fontSize: 13, color: "#55556a", marginBottom: 24 }}>{display.token} on {display.chain} · {display.apy.toFixed(2)}% APY</div>

        {(step === "idle" || step === "error") ? (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Amount ({display.token})</div>
              <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                style={{ width: "100%", padding: "14px 16px", borderRadius: 8, border: "1px solid #2a2a3d", background: "#1e1e2d", color: "#e8e8f0", fontFamily: "'Space Mono', monospace", fontSize: 16, outline: "none" }} />
            </div>

            {[
              ["Protocol", display.protocol],
              ["Chain", display.chain],
              ["Current APY", `${display.apy.toFixed(2)}%`],
              ["Est. monthly yield", `${estimatedMonthlyYield} ${display.token}`],
              ["Risk", display.risk],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "#8888a8", borderBottom: "1px solid rgba(42,42,61,0.5)" }}>
                <span>{label}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: label === "Risk" ? (riskColors[val!] || "#8888a8") : label === "Current APY" ? "#22c55e" : "#e8e8f0" }}>{val}</span>
              </div>
            ))}

            {step === "error" && error && (
              <div style={{ marginTop: 16, padding: 12, background: "#1c0707", border: "1px solid #ef4444", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>{error}</div>
            )}

            <button onClick={handleDeposit} disabled={!amount || parseFloat(amount) <= 0 || !isConnected}
              style={{ width: "100%", padding: 14, marginTop: 20, borderRadius: 12, border: "none", background: isConnected ? "#6366f1" : "#333", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: (!amount || parseFloat(amount) <= 0 || !isConnected) ? 0.4 : 1 }}>
              {!isConnected ? "Connect wallet first" : `Deposit ${amount || "0"} ${display.token}`}
            </button>
            <button onClick={onClose} style={{ width: "100%", padding: 12, marginTop: 8, borderRadius: 12, border: "1px solid #2a2a3d", background: "transparent", color: "#8888a8", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{step === "success" ? "✅" : step === "error" ? "❌" : "⏳"}</div>
            <div style={{ fontSize: 15, color: step === "success" ? "#22c55e" : "#8888a8" }}>{STEP_LABELS[step]}</div>
            {txHash && <div style={{ fontSize: 12, color: "#55556a", marginTop: 12, fontFamily: "'Space Mono', monospace" }}>tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function YieldBuilder() {
  const [tab, setTab] = useState<"discover" | "portfolio">("discover");
  const [chainFilter, setChainFilter] = useState<{ label: string; id?: number }>(chainOptions[0]);
  const [tokenFilter, setTokenFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"apy" | "tvl">("apy");
  const [selectedVault, setSelectedVault] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);

  const { isConnected } = useAccount();

  // ── Fetch real vaults from Earn API ────────────────────────────
  const {
    vaults: apiVaults,
    loading: vaultsLoading,
    error: vaultsError,
  } = useOpportunities({
    asset: tokenFilter !== "All" ? tokenFilter : undefined,
    chainId: chainFilter.id,
    limit: 50,
  });

  const {
    positions: apiPositions,
    loading: posLoading,
    refetch: refetchPositions,
  } = usePositions();

  // Fall back to mock if API fails
  useEffect(() => {
    if (vaultsError) {
      console.warn("Earn API not reachable — using mock data. Error:", vaultsError);
      setUseMock(true);
    } else if (apiVaults.length > 0) {
      setUseMock(false);
    }
  }, [vaultsError, apiVaults]);

  // Process vaults for display
  const displayVaults = useMock
    ? MOCK_VAULTS
        .filter((v) => !chainFilter.id || v.chainId === chainFilter.id)
        .filter((v) => tokenFilter === "All" || v.asset === tokenFilter)
        .sort((a, b) => sortBy === "apy" ? b.apy - a.apy : b.tvlUsd - a.tvlUsd)
    : apiVaults
        .map((v) => ({ ...v, _display: getVaultDisplay(v) }))
        .filter((v) => tokenFilter === "All" || v._display.token.toUpperCase() === tokenFilter.toUpperCase())
        .sort((a, b) => sortBy === "apy" ? b._display.apy - a._display.apy : b._display.tvl - a._display.tvl);

  const positions = apiPositions;

  const totalDeposited = positions.reduce((s, p: any) => s + (p.balanceUsd || p.deposited || 0), 0);
  const totalYield = positions.reduce((s, p: any) => s + (p.yieldEarned || p.earnedUsd || 0), 0);
  const avgApy = positions.length ? positions.reduce((s, p: any) => s + (p.apy || 0), 0) / positions.length : 0;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=Space+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
  `;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0a0a0f", color: "#e8e8f0", minHeight: "100vh" }}>
      <style>{styles}</style>

      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid #2a2a3d", position: "sticky", top: 0, zIndex: 50, background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)" }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18 }}>yield<span style={{ color: "#6366f1" }}>.</span>mullet</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {useMock && <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>MOCK DATA</span>}
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
        </div>
      </header>

      <ConfigWarning />

      {/* Tabs */}
      <div style={{ display: "flex", padding: "0 32px", borderBottom: "1px solid #2a2a3d" }}>
        {(["discover", "portfolio"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "16px 24px", border: "none", background: "none", color: tab === t ? "#e8e8f0" : "#55556a", fontSize: 14, fontWeight: 500, cursor: "pointer", borderBottom: `2px solid ${tab === t ? "#6366f1" : "transparent"}`, textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif" }}>{t}</button>
        ))}
      </div>

      {/* ═══════ DISCOVER ═══════ */}
      {tab === "discover" && (
        <>
          <div style={{ padding: "20px 32px 8px" }}>
            <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Chain</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {chainOptions.map((c) => (
                <button key={c.label} onClick={() => setChainFilter(c)} style={{ padding: "7px 16px", borderRadius: 100, fontSize: 13, cursor: "pointer", border: `1px solid ${chainFilter.label === c.label ? "#6366f1" : "#2a2a3d"}`, background: chainFilter.label === c.label ? "rgba(99,102,241,0.15)" : "transparent", color: chainFilter.label === c.label ? "#6366f1" : "#8888a8", fontFamily: "'DM Sans', sans-serif" }}>{c.label}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Token</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {tokenOptions.map((t) => (
                <button key={t} onClick={() => setTokenFilter(t)} style={{ padding: "7px 16px", borderRadius: 100, fontSize: 13, cursor: "pointer", border: `1px solid ${tokenFilter === t ? "#6366f1" : "#2a2a3d"}`, background: tokenFilter === t ? "rgba(99,102,241,0.15)" : "transparent", color: tokenFilter === t ? "#6366f1" : "#8888a8", fontFamily: "'DM Sans', sans-serif" }}>{t}</button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 32px 12px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#55556a" }}>Sort:</span>
            {(["apy", "tvl"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)} style={{ padding: "5px 12px", borderRadius: 100, fontSize: 12, cursor: "pointer", border: `1px solid ${sortBy === s ? "#6366f1" : "#2a2a3d"}`, background: sortBy === s ? "rgba(99,102,241,0.15)" : "transparent", color: sortBy === s ? "#6366f1" : "#8888a8", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" }}>{s} ↓</button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#55556a" }}>
              {vaultsLoading ? "Loading..." : `${displayVaults.length} opportunities`}
            </span>
          </div>

          {/* Vault rows */}
          <div style={{ padding: "0 32px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1.2fr 1fr 0.8fr", padding: "8px 20px 12px", color: "#55556a", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>
              <span>Protocol</span><span>Token</span><span>APY</span><span>TVL</span><span>Risk</span><span></span>
            </div>

            {displayVaults.map((vault: any) => {
              const d = useMock ? getVaultDisplay(vault) : (vault._display || getVaultDisplay(vault));
              return (
                <div key={d.id} onClick={() => setSelectedVault(vault)} style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1.2fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", border: "1px solid #2a2a3d", borderRadius: 12, marginBottom: 8, cursor: "pointer", background: "#12121a", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ fontSize: 24, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#1e1e2d", borderRadius: 8 }}>{d.logo}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{d.protocol}</div>
                      <div style={{ fontSize: 12, color: "#55556a" }}>{d.chain}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 500 }}>{d.token}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, color: "#22c55e" }}>{d.apy.toFixed(2)}%</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: "#8888a8" }}>{fmtUsd(d.tvl)}</div>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 100, color: riskColors[d.risk] || "#8888a8", background: (riskColors[d.risk] || "#888") + "18", textTransform: "uppercase" }}>{d.risk}</span>
                  </div>
                  <div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedVault(vault); }} style={{ padding: "8px 18px", borderRadius: 100, border: "none", background: "#6366f1", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Deposit</button>
                  </div>
                </div>
              );
            })}

            {!vaultsLoading && displayVaults.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#55556a" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <div style={{ fontSize: 15 }}>No vaults found for this filter combination.</div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ PORTFOLIO ═══════ */}
      {tab === "portfolio" && (
        <>
          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "80px 32px", color: "#55556a" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
              <div style={{ fontSize: 15 }}>Connect your wallet to view positions.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 32, padding: "24px 32px" }}>
                {[
                  ["Total Deposited", fmtUsd(totalDeposited), false],
                  ["Total Yield Earned", "+" + fmtUsd(totalYield), true],
                  ["Avg APY", avgApy.toFixed(2) + "%", true],
                ].map(([label, value, isGreen]) => (
                  <div key={label as string} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: isGreen ? "#22c55e" : "#e8e8f0" }}>{value}</span>
                  </div>
                ))}
              </div>

              {positions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 32px", color: "#55556a" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <div style={{ fontSize: 15 }}>{posLoading ? "Loading positions..." : "No positions yet. Head to Discover to make your first deposit."}</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, padding: "0 32px 32px" }}>
                  {positions.map((pos: any, i: number) => (
                    <div key={pos.vaultAddress || i} style={{ background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 12, padding: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pos.vault?.protocol || pos.protocol || "Vault"}</div>
                          <div style={{ fontSize: 12, color: "#55556a" }}>{pos.vault?.chainName || pos.chain || ""}</div>
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#22c55e" }}>{(pos.apy || pos.vault?.apy || 0).toFixed(2)}% APY</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          ["Balance", `${fmt(pos.balance || pos.balanceUsd || 0)} ${pos.asset || pos.token || ""}`, false],
                          ["Yield Earned", `+${fmt(pos.yieldEarned || pos.earnedUsd || 0)}`, true],
                        ].map(([label, value, isGreen]) => (
                          <div key={label as string}>
                            <div style={{ fontSize: 11, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 600, color: isGreen ? "#22c55e" : "#e8e8f0" }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Deposit Modal */}
      {selectedVault && (
        <DepositModal
          vault={selectedVault}
          onClose={() => setSelectedVault(null)}
          onSuccess={() => { showToast("Deposit submitted!"); refetchPositions(); }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#12121a", border: "1px solid #22c55e", borderRadius: 12, padding: "16px 24px", fontSize: 14, color: "#22c55e", zIndex: 200 }}>✓ {toast}</div>
      )}
    </div>
  );
}
