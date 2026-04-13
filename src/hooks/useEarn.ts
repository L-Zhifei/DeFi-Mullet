// src/hooks/useEarn.ts
// ═══════════════════════════════════════════════════════════════════
// React hooks wired to the REAL LI.FI Earn API
// Uses functions from src/services/earn-api.ts and composerApi.ts
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";

// ── Import from your friend's actual API files ───────────────────
// earn-api.ts (renamed from earnApi.ts)
import {
  getStablecoinVaults,
  getVault,
  getSupportedChains,
  getSupportedProtocols,
  getUserPortfolio,
} from "../services/earn-api";

// composerApi.ts
import {
  buildDepositQuote,
  buildWithdrawQuote,
} from "../services/composerApi";

// types.ts
import type {
  Vault,
  VaultsResponse,
  Position,
  PortfolioResponse,
  QuoteResponse,
} from "../services/types";

// ─── Hook: Discover Opportunities (Vaults) ───────────────────────

interface VaultFilters {
  asset?: string;
  chainId?: number;
  limit?: number;
}

// Map chain names to chain IDs for filtering
const CHAIN_NAME_TO_ID: Record<string, number> = {
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  polygon: 137,
};

export function useOpportunities(filters: VaultFilters = {}) {
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result: VaultsResponse = await getStablecoinVaults({
        asset: filters.asset,
        chainId: filters.chainId,
        limit: filters.limit || 50,
      });
      setVaults(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load vaults");
      console.error("[useOpportunities]", err);
    } finally {
      setLoading(false);
    }
  }, [filters.asset, filters.chainId, filters.limit]);

  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  return { vaults, total, loading, error, refetch: fetchVaults };
}

// ─── Hook: Supported Chains ──────────────────────────────────────

export function useSupportedChains() {
  const [chains, setChains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupportedChains()
      .then(setChains)
      .catch((err) => console.error("[useSupportedChains]", err))
      .finally(() => setLoading(false));
  }, []);

  return { chains, loading };
}

// ─── Hook: Supported Protocols ───────────────────────────────────

export function useSupportedProtocols() {
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupportedProtocols()
      .then(setProtocols)
      .catch((err) => console.error("[useSupportedProtocols]", err))
      .finally(() => setLoading(false));
  }, []);

  return { protocols, loading };
}

// ─── Hook: User Positions / Portfolio ────────────────────────────

export function usePositions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!address || !isConnected) {
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const portfolio: PortfolioResponse = await getUserPortfolio(address);
      setPositions(portfolio.positions || []);
    } catch (err: any) {
      setError(err.message || "Failed to load positions");
      console.error("[usePositions]", err);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions };
}

// ─── Hook: Deposit Flow ──────────────────────────────────────────
// Full lifecycle:
//   1. Build deposit quote via Composer API
//   2. Switch chain if needed
//   3. Send approval tx (if required)
//   4. Send deposit tx
//   5. Report success/failure

export type DepositStep =
  | "idle"
  | "quoting"
  | "switching-chain"
  | "approving"
  | "depositing"
  | "success"
  | "error";

export function useDeposit() {
  const { address, chainId } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { switchChainAsync } = useSwitchChain();

  const [step, setStep] = useState<DepositStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const deposit = useCallback(
    async (vault: Vault, amount: string, fromTokenAddress: string) => {
      if (!address) {
        setError("Wallet not connected");
        setStep("error");
        return;
      }

      setStep("quoting");
      setError(null);
      setTxHash(null);

      try {
        // ── Step 1: Get deposit quote from Composer API ────────
        const quote: QuoteResponse = await buildDepositQuote({
          fromChainId: vault.chainId || chainId || 1,
          fromTokenAddress: fromTokenAddress,
          fromAmount: amount, // already in smallest unit (e.g., "1000000" for 1 USDC)
          fromAddress: address,
          vaultChainId: vault.chainId || 1,
          vaultAddress: vault.address || "",
        });

        // ── Step 2: Switch chain if needed ─────────────────────
        const targetChainId = vault.chainId;
        if (targetChainId && chainId !== targetChainId) {
          setStep("switching-chain");
          await switchChainAsync({ chainId: targetChainId });
        }

        // ── Step 3: Send the transaction ───────────────────────
        // The Composer API returns a transactionRequest object
        // that can be sent directly via the wallet
        if (quote.transactionRequest) {
          setStep("depositing");
          const hash = await sendTransactionAsync({
            to: quote.transactionRequest.to as `0x${string}`,
            data: quote.transactionRequest.data as `0x${string}`,
            value: BigInt(quote.transactionRequest.value || "0"),
          });

          setTxHash(hash);
          setStep("success");
        } else {
          throw new Error("No transaction data returned from Composer");
        }
      } catch (err: any) {
        console.error("[useDeposit]", err);
        setError(err.message || "Deposit failed");
        setStep("error");
      }
    },
    [address, chainId, sendTransactionAsync, switchChainAsync]
  );

  // ── Withdraw ───────────────────────────────────────────────────
  const withdraw = useCallback(
    async (vault: Vault, amount: string, toTokenAddress: string) => {
      if (!address) {
        setError("Wallet not connected");
        setStep("error");
        return;
      }

      setStep("quoting");
      setError(null);
      setTxHash(null);

      try {
        const quote: QuoteResponse = await buildWithdrawQuote({
          fromChainId: vault.chainId || chainId || 1,
          vaultAddress: vault.address || "",
          fromAmount: amount,
          fromAddress: address,
          toTokenAddress: toTokenAddress,
        });

        if (quote.transactionRequest) {
          setStep("depositing");
          const hash = await sendTransactionAsync({
            to: quote.transactionRequest.to as `0x${string}`,
            data: quote.transactionRequest.data as `0x${string}`,
            value: BigInt(quote.transactionRequest.value || "0"),
          });

          setTxHash(hash);
          setStep("success");
        } else {
          throw new Error("No transaction data returned from Composer");
        }
      } catch (err: any) {
        console.error("[useWithdraw]", err);
        setError(err.message || "Withdraw failed");
        setStep("error");
      }
    },
    [address, chainId, sendTransactionAsync, switchChainAsync]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { deposit, withdraw, step, error, txHash, reset };
}

// ─── Export chain mapping for UI use ─────────────────────────────
export { CHAIN_NAME_TO_ID };
