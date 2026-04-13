import { QuoteRequest, QuoteResponse } from './types'

const BASE_URL = 'https://li.quest'
const API_KEY = '9510b872-7535-4384-850c-2be1f00d913a.443f499a-98c4-40ee-97b7-704f8b958e0d'

const headers = {
  'x-lifi-api-key': API_KEY,
  'Content-Type': 'application/json',
}

// 构建存入金库的交易（返回待签名的 transactionRequest）
export async function buildDepositQuote(params: {
  fromChainId: number
  fromTokenAddress: string  // 用户当前持有的代币地址
  fromAmount: string        // 金额（以最小单位，如 USDC 6位小数：100 USDC = "100000000"）
  fromAddress: string       // 用户钱包地址
  vaultChainId: number
  vaultAddress: string      // 目标金库地址
}): Promise<QuoteResponse> {
  const body: QuoteRequest = {
    fromChainId: params.fromChainId,
    fromTokenAddress: params.fromTokenAddress,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    toChainId: params.vaultChainId,
    toTokenAddress: params.fromTokenAddress,
    toContractAddress: params.vaultAddress,
  }

  const res = await fetch(`${BASE_URL}/v1/quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`buildDepositQuote failed: ${res.status} - ${err}`)
  }

  return res.json()
}

// 构建从金库取出的交易
export async function buildWithdrawQuote(params: {
  fromChainId: number
  vaultAddress: string      // 金库地址（用户从这里取出）
  fromAmount: string        // 取出的 LP token 数量
  fromAddress: string       // 用户钱包地址
  toTokenAddress: string    // 希望收到的代币地址
}): Promise<QuoteResponse> {
  const res = await fetch(`${BASE_URL}/v1/quote`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      fromChainId: params.fromChainId,
      fromTokenAddress: params.vaultAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toChainId: params.fromChainId,
      toTokenAddress: params.toTokenAddress,
      toContractAddress: params.vaultAddress,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`buildWithdrawQuote failed: ${res.status} - ${err}`)
  }

  return res.json()
}
