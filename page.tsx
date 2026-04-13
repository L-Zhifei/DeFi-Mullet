// src/app/page.tsx
// ═══════════════════════════════════════════════════════════════════
// Yield Builder Dashboard — Main page
//
// This is the full app wired to:
//   ✅ LI.FI Earn API  (via src/services/earn-api.ts)
//   ✅ Wallet           (via wagmi + RainbowKit)
//   ✅ Your RPC keys    (via src/config/wallet.ts)
//
// It falls back to mock data if the Earn API isn't reachable yet
// (useful while LI.FI finalizes the endpoint URLs).
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
  type DepositStep,
} from "../hooks/useEarn";
import type { Opportunity } from "../services/earn-api";

// ─── Fallback mock data (used if API isn't live yet) ─────────────
const MOCK_OPPORTUNITIES: Opportunity[] = [
  { id: "opp-1", protocol: "Morpho", chain: "Arbitrum", token: "USDC", apy: 8.42, tvl: 142_500_000, risk: "Low" },
  { id: "opp-2", protocol: "Aave", chain: "Ethereum", token: "ETH", apy: 3.21, tvl: 890_000_000, risk: "Low" },
  { id: "opp-3", protocol: "Euler", chain: "Base", token: "USDC", apy: 11.07, tvl: 58_200_000, risk: "Medium" },
  { id: "opp-4", protocol: "Pendle", chain: "Arbitrum", token: "ETH", apy: 14.55, tvl: 34_100_000, risk: "Medium" },
  { id: "opp-5", protocol: "Ethena", chain: "Ethereum", token: "USDe", apy: 22.30, tvl: 210_000_000, risk: "High" },
  { id: "opp-6", protocol: "EtherFi", chain: "Ethereum", token: "ETH", apy: 4.88, tvl: 420_000_000, risk: "Low" },
  { id: "opp-7", protocol: "Morpho", chain: "Base", token: "USDC", apy: 9.15, tvl: 67_300_000, risk: "Low" },
  { id: "opp-8", protocol: "Aave", chain: "Optimism", token: "USDT", apy: 5.63, tvl: 125_800_000, risk: "Low" },
];

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtUsd = (n: number) => "$" + fmt(n);
const chainOptions = ["All", "Ethereum", "Arbitrum", "Base", "Optimism"];
const tokenOptions = ["All", "USDC", "ETH", "USDT", "USDe"];
const riskColors: Record<string, string> = { Low: "#22c55e", Medium: "#f59e0b", High: "#ef4444" };
const protocolEmojis: Record<string, string> = {
  Morpho: "🔵", Aave: "👻", Euler: "🟣", Pendle: "🔶",
  Ethena: "🟡", EtherFi: "🌊", default: "⚡",
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

// ─── Config warning banner ───────────────────────────────────────
function ConfigWarning() {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const { errors: errs } = validateConfig();
    setErrors(errs);
  }, []);

  if (errors.length === 0) return null;

  return (
    <div style={{
      background: "#1c1007", border: "1px solid #f59e0b", borderRadius: 12,
      padding: "16px 24px", margin: "16px 32px",
    }}>
      <div style={{ fontWeight: 700, color: "#f59e0b", marginBottom: 8, fontSize: 14 }}>
        ⚠️ Setup needed — check your .env.local
      </div>
      {errors.map((e, i) => (
        <div key={i} style={{ fontSize: 13, color: "#d4a34a", marginBottom: 4 }}>• {e}</div>
      ))}
      <div style={{ fontSize: 12, color: "#8a7040", marginTop: 8 }}>
        The app will use mock data until these are configured.
      </div>
    </div>
  );
}

// ─── Deposit Modal ───────────────────────────────────────────────
function DepositModal({
  opportunity,
  onClose,
  onSuccess,
}: {
  opportunity: Opportunity;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const { deposit, step, error, txHash, reset } = useDeposit();
  const { isConnected } = useAccount();

  const estimatedMonthlyYield = amount
    ? ((parseFloat(amount) * (opportunity.apy / 100)) / 12).toFixed(2)
    : "0.00";

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await deposit(opportunity, amount);
  };

  useEffect(() => {
    if (step === "success") {
      const timer = setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const isProcessing = ["quoting", "switching-chain", "approving", "depositing"].includes(step);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, backdropFilter: "blur(4px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#12121a", border: "1px solid #2a2a3d", borderRadius: 16,
        padding: 32, width: 420, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Deposit into {opportunity.protocol}
        </div>
        <div style={{ fontSize: 13, color: "#55556a", marginBottom: 24 }}>
          {opportunity.token} on {opportunity.chain} · {opportunity.apy}% APY
        </div>

        {step === "idle" || step === "error" ? (
          <>
            {/* Amount input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Amount ({opportunity.token})
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: 8,
                  border: "1px solid #2a2a3d", background: "#1e1e2d",
                  color: "#e8e8f0", fontFamily: "'Space Mono', monospace", fontSize: 16,
                  outline: "none",
                }}
              />
            </div>

            {/* Info rows */}
            {[
              ["Protocol", opportunity.protocol],
              ["Chain", opportunity.chain],
              ["Current APY", `${opportunity.apy}%`],
              [`Est. monthly yield`, `${estimatedMonthlyYield} ${opportunity.token}`],
              ["Risk", opportunity.risk],
            ].map(([label, val]) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", padding: "8px 0",
                fontSize: 13, color: "#8888a8", borderBottom: "1px solid rgba(42,42,61,0.5)",
              }}>
                <span>{label}</span>
                <span style={{
                  fontFamily: "'Space Mono', monospace", color:
                    label === "Risk" ? riskColors[val!] :
                    label === "Current APY" ? "#22c55e" : "#e8e8f0",
                }}>{val}</span>
              </div>
            ))}

            {/* Error message */}
            {step === "error" && error && (
              <div style={{ marginTop: 16, padding: 12, background: "#1c0707", border: "1px solid #ef4444", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
                {error}
              </div>
            )}

            {/* Deposit button */}
            <button
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0 || !isConnected}
              style={{
                width: "100%", padding: 14, marginTop: 20, borderRadius: 12, border: "none",
                background: isConnected ? "#6366f1" : "#333",
                color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer",
                opacity: (!amount || parseFloat(amount) <= 0 || !isConnected) ? 0.4 : 1,
              }}
            >
              {!isConnected
                ? "Connect wallet first"
                : `Deposit ${amount || "0"} ${opportunity.token}`}
            </button>
            <button onClick={onClose} style={{
              width: "100%", padding: 12, marginTop: 8, borderRadius: 12,
              border: "1px solid #2a2a3d", background: "transparent",
              color: "#8888a8", fontSize: 14, cursor: "pointer",
            }}>Cancel</button>
          </>
        ) : (
          /* Processing / Success states */
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {step === "success" ? "✅" : step === "error" ? "❌" : "⏳"}
            </div>
            <div style={{ fontSize: 15, color: step === "success" ? "#22c55e" : "#8888a8" }}>
              {STEP_LABELS[step]}
            </div>
            {txHash && (
              <div style={{ fontSize: 12, color: "#55556a", marginTop: 12, fontFamily: "'Space Mono', monospace" }}>
                tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function YieldBuilder() {
  const [tab, setTab] = useState<"discover" | "portfolio">("discover");
  const [chainFilter, setChainFilter] = useState("All");
  const [tokenFilter, setTokenFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"apy" | "tvl">("apy");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [useMock, setUseMock] = useState(false);

  const { isConnected, address } = useAccount();

  // ── Fetch from Earn API (falls back to mock) ───────────────────
  const apiFilters = {
    chain: chainFilter !== "All" ? chainFilter.toLowerCase() : undefined,
    token: tokenFilter !== "All" ? tokenFilter : undefined,
    sort: sortBy,
  };

  const {
    opportunities: apiOpps,
    loading: oppsLoading,
    error: oppsError,
  } = useOpportunities(useMock ? {} : apiFilters);

  const {
    positions: apiPositions,
    loading: posLoading,
    refetch: refetchPositions,
  } = usePositions();

  // Fall back to mock if API fails
  useEffect(() => {
    if (oppsError) {
      console.warn("Earn API not reachable — using mock data");
      setUseMock(true);
    }
  }, [oppsError]);

  const opportunities = useMock
    ? MOCK_OPPORTUNITIES
        .filter((o) => chainFilter === "All" || o.chain === chainFilter)
        .filter((o) => tokenFilter === "All" || o.token === tokenFilter)
        .sort((a, b) => (sortBy === "apy" ? b.apy - a.apy : b.tvl - a.tvl))
    : apiOpps;

  const positions = useMock ? [] : apiPositions;

  const totalDeposited = positions.reduce((s, p) => s + (p.deposited || 0), 0);
  const totalYield = positions.reduce((s, p) => s + (p.yieldEarned || 0), 0);
  const avgApy = positions.length
    ? positions.reduce((s, p) => s + p.apy, 0) / positions.length
    : 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Styles ─────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=Space+Mono:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
  `;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#0a0a0f", color: "#e8e8f0", minHeight: "100vh" }}>
      <style>{styles}</style>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px", borderBottom: "1px solid #2a2a3d",
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(10,10,15,0.9)", backdropFilter: "blur(12px)",
      }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18 }}>
          yield<span style={{ color: "#6366f1" }}>.</span>mullet
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {useMock && (
            <span style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>
              MOCK DATA
            </span>
          )}
          {/* RainbowKit's ConnectButton replaces the manual wallet button */}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </header>

      {/* Config warnings */}
      <ConfigWarning />

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", padding: "0 32px", borderBottom: "1px solid #2a2a3d" }}>
        {(["discover", "portfolio"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "16px 24px", border: "none", background: "none",
            color: tab === t ? "#e8e8f0" : "#55556a", fontSize: 14, fontWeight: 500,
            cursor: "pointer", borderBottom: `2px solid ${tab === t ? "#6366f1" : "transparent"}`,
            textTransform: "capitalize", fontFamily: "'DM Sans', sans-serif",
          }}>{t}</button>
        ))}
      </div>

      {/* ═══════ DISCOVER TAB ═══════ */}
      {tab === "discover" && (
        <>
          {/* Filters */}
          <div style={{ padding: "20px 32px 8px" }}>
            <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Chain</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {chainOptions.map((c) => (
                <button key={c} onClick={() => setChainFilter(c)} style={{
                  padding: "7px 16px", borderRadius: 100, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${chainFilter === c ? "#6366f1" : "#2a2a3d"}`,
                  background: chainFilter === c ? "rgba(99,102,241,0.15)" : "transparent",
                  color: chainFilter === c ? "#6366f1" : "#8888a8",
                  fontFamily: "'DM Sans', sans-serif",
                }}>{c}</button>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Token</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              {tokenOptions.map((t) => (
                <button key={t} onClick={() => setTokenFilter(t)} style={{
                  padding: "7px 16px", borderRadius: 100, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${tokenFilter === t ? "#6366f1" : "#2a2a3d"}`,
                  background: tokenFilter === t ? "rgba(99,102,241,0.15)" : "transparent",
                  color: tokenFilter === t ? "#6366f1" : "#8888a8",
                  fontFamily: "'DM Sans', sans-serif",
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Sort + count */}
          <div style={{ padding: "0 32px 12px", display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#55556a" }}>Sort:</span>
            {(["apy", "tvl"] as const).map((s) => (
              <button key={s} onClick={() => setSortBy(s)} style={{
                padding: "5px 12px", borderRadius: 100, fontSize: 12, cursor: "pointer",
                border: `1px solid ${sortBy === s ? "#6366f1" : "#2a2a3d"}`,
                background: sortBy === s ? "rgba(99,102,241,0.15)" : "transparent",
                color: sortBy === s ? "#6366f1" : "#8888a8",
                fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase",
              }}>{s} ↓</button>
            ))}
            <span style={{ marginLeft: "auto", fontSize: 13, color: "#55556a" }}>
              {oppsLoading ? "Loading..." : `${opportunities.length} opportunities`}
            </span>
          </div>

          {/* Opportunity rows */}
          <div style={{ padding: "0 32px 32px" }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1.2fr 1fr 0.8fr",
              padding: "8px 20px 12px", color: "#55556a",
              fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2,
            }}>
              <span>Protocol</span><span>Token</span><span>APY</span>
              <span>TVL</span><span>Risk</span><span></span>
            </div>

            {opportunities.map((opp) => (
              <div key={opp.id} onClick={() => setSelectedOpp(opp)} style={{
                display: "grid", gridTemplateColumns: "2.2fr 1fr 1fr 1.2fr 1fr 0.8fr",
                alignItems: "center", padding: "16px 20px",
                border: "1px solid #2a2a3d", borderRadius: 12, marginBottom: 8,
                cursor: "pointer", background: "#12121a", transition: "all 0.15s",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    fontSize: 24, width: 36, height: 36, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: "#1e1e2d", borderRadius: 8,
                  }}>
                    {protocolEmojis[opp.protocol] || protocolEmojis.default}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{opp.protocol}</div>
                    <div style={{ fontSize: 12, color: "#55556a" }}>{opp.chain}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 500 }}>{opp.token}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, color: "#22c55e" }}>
                  {opp.apy}%
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, color: "#8888a8" }}>
                  {fmtUsd(opp.tvl)}
                </div>
                <div>
                  <span style={{
                    fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 100,
                    color: riskColors[opp.risk] || "#8888a8",
                    background: (riskColors[opp.risk] || "#888") + "18",
                    textTransform: "uppercase",
                  }}>{opp.risk}</span>
                </div>
                <div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedOpp(opp); }} style={{
                    padding: "8px 18px", borderRadius: 100, border: "none",
                    background: "#6366f1", color: "white", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                  }}>Deposit</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ═══════ PORTFOLIO TAB ═══════ */}
      {tab === "portfolio" && (
        <>
          {!isConnected ? (
            <div style={{ textAlign: "center", padding: "80px 32px", color: "#55556a" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
              <div style={{ fontSize: 15 }}>Connect your wallet to view positions.</div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: "flex", gap: 32, padding: "24px 32px" }}>
                {[
                  ["Total Deposited", fmtUsd(totalDeposited), false],
                  ["Total Yield Earned", "+" + fmtUsd(totalYield), true],
                  ["Avg APY", avgApy.toFixed(2) + "%", true],
                ].map(([label, value, isGreen]) => (
                  <div key={label as string} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 12, color: "#55556a", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
                    <span style={{
                      fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700,
                      color: isGreen ? "#22c55e" : "#e8e8f0",
                    }}>{value}</span>
                  </div>
                ))}
              </div>

              {positions.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 32px", color: "#55556a" }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                  <div style={{ fontSize: 15 }}>
                    {posLoading ? "Loading positions..." : "No positions yet. Head to Discover to make your first deposit."}
                  </div>
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: 16, padding: "0 32px 32px",
                }}>
                  {positions.map((pos) => (
                    <div key={pos.id} style={{
                      background: "#12121a", border: "1px solid #2a2a3d",
                      borderRadius: 12, padding: 24,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{pos.protocol}</div>
                          <div style={{ fontSize: 12, color: "#55556a" }}>{pos.chain}</div>
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#22c55e" }}>
                          {pos.apy}% APY
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {[
                          ["Deposited", `${fmt(pos.deposited)} ${pos.token}`, false],
                          ["Current", `${fmt(pos.current)} ${pos.token}`, false],
                          ["Yield", `+${fmt(pos.yieldEarned)} ${pos.token}`, true],
                          ["Token", pos.token, false],
                        ].map(([label, value, isGreen]) => (
                          <div key={label as string}>
                            <div style={{ fontSize: 11, color: "#55556a", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                            <div style={{
                              fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 600,
                              color: isGreen ? "#22c55e" : "#e8e8f0",
                            }}>{value}</div>
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
      {selectedOpp && (
        <DepositModal
          opportunity={selectedOpp}
          onClose={() => setSelectedOpp(null)}
          onSuccess={() => {
            showToast(`Deposited into ${selectedOpp.protocol}`);
            refetchPositions();
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "#12121a", border: "1px solid #22c55e", borderRadius: 12,
          padding: "16px 24px", fontSize: 14, color: "#22c55e", zIndex: 200,
        }}>✓ {toast}</div>
      )}
    </div>
  );
}
