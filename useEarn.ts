// src/hooks/useEarn.ts
// ═══════════════════════════════════════════════════════════════════
// React hooks that connect the Earn API to your UI.
// These handle loading states, errors, and re-fetching.
// ═══════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendTransaction, useSwitchChain } from "wagmi";
import {
  discoverOpportunities,
  getQuote,
  getPositions,
  toSmallestUnit,
  type Opportunity,
  type Position,
  type DiscoverFilters,
  type QuoteResponse,
} from "../services/earn-api";
import { CHAIN_NAME_TO_ID } from "../config/wallet";

// ─── Hook: Discover Opportunities ────────────────────────────────

export function useOpportunities(filters: DiscoverFilters = {}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await discoverOpportunities(filters);
      setOpportunities(data);
    } catch (err: any) {
      setError(err.message || "Failed to load opportunities");
      console.error("[useOpportunities]", err);
    } finally {
      setLoading(false);
    }
  }, [filters.chain, filters.token, filters.protocol, filters.sort]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { opportunities, loading, error, refetch: fetch };
}

// ─── Hook: User Positions ────────────────────────────────────────

export function usePositions() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!address || !isConnected) {
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPositions(address);
      setPositions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load positions");
      console.error("[usePositions]", err);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { positions, loading, error, refetch: fetch };
}

// ─── Hook: Deposit Flow ──────────────────────────────────────────
// Manages the full deposit lifecycle:
//   1. Get quote from Earn API
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
    async (opportunity: Opportunity, amount: string) => {
      if (!address) {
        setError("Wallet not connected");
        setStep("error");
        return;
      }

      setStep("quoting");
      setError(null);
      setTxHash(null);

      try {
        // ── Step 1: Get quote ──────────────────────────────────
        const smallestUnit = toSmallestUnit(amount, opportunity.token);

        const quote: QuoteResponse = await getQuote({
          opportunityId: opportunity.id,
          walletAddress: address,
          amount: smallestUnit,
        });

        // ── Step 2: Switch chain if needed ─────────────────────
        const targetChainId =
          CHAIN_NAME_TO_ID[opportunity.chain.toLowerCase()];

        if (targetChainId && chainId !== targetChainId) {
          setStep("switching-chain");
          await switchChainAsync({ chainId: targetChainId });
        }

        // ── Step 3: Approval tx (if token needs approval) ──────
        if (quote.approvalTx) {
          setStep("approving");
          await sendTransactionAsync({
            to: quote.approvalTx.to as `0x${string}`,
            data: quote.approvalTx.data as `0x${string}`,
            value: BigInt(quote.approvalTx.value || "0"),
          });
        }

        // ── Step 4: Deposit tx ─────────────────────────────────
        setStep("depositing");
        const hash = await sendTransactionAsync({
          to: quote.depositTx.to as `0x${string}`,
          data: quote.depositTx.data as `0x${string}`,
          value: BigInt(quote.depositTx.value || "0"),
        });

        setTxHash(hash);
        setStep("success");
      } catch (err: any) {
        console.error("[useDeposit]", err);
        setError(err.message || "Deposit failed");
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

  return { deposit, step, error, txHash, reset };
}
