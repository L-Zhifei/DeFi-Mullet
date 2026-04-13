// Earn Data API Types

export interface UnderlyingToken {
  symbol: string
  address: string
  decimals: number
}

export interface VaultAnalytics {
  apy: {
    base: number
    total: number
    reward: number
  }
  tvl: {
    usd: string
  }
  apy1d: number
  apy7d: number
  apy30d: number
  updatedAt: string
}

export interface DepositPack {
  name: string
  stepsType: string
}

export interface Vault {
  name: string
  slug: string
  address: string
  chainId: number
  network: string
  protocol: {
    name: string
    url: string
  }
  tags: string[]
  analytics: VaultAnalytics
  underlyingTokens: UnderlyingToken[]
  depositPacks: DepositPack[]
  redeemPacks: DepositPack[]
  isRedeemable: boolean
  isTransactional: boolean
  description?: string
}

export interface VaultsResponse {
  data: Vault[]
  nextCursor?: string
  total: number
}

// Portfolio Types

export interface PositionBalance {
  amountUsd: number
  amount: string
}

export interface Position {
  chainId: number
  protocol: string
  vault: Vault
  balance: PositionBalance
}

export interface PortfolioResponse {
  positions: Position[]
}

// Composer API Types

export interface QuoteRequest {
  fromChainId: number
  fromTokenAddress: string
  fromAmount: string
  fromAddress: string
  toChainId: number
  toTokenAddress: string
  toContractAddress: string
}

export interface QuoteResponse {
  id: string
  type: string
  estimate: {
    fromAmount: string
    toAmount: string
    gasCosts: { amountUsd: string }[]
  }
  transactionRequest: {
    to: string
    data: string
    value: string
    gasLimit: string
    chainId: number
  }
}
