import { Vault, VaultsResponse, PortfolioResponse } from './types'

// 注意：真实 API 返回的金库列表在 response.data 里，总数在 response.total

const BASE_URL = 'https://earn.li.fi'
const API_KEY = '9510b872-7535-4384-850c-2be1f00d913a.443f499a-98c4-40ee-97b7-704f8b958e0d'

const headers = {
  'x-lifi-api-key': API_KEY,
  'Content-Type': 'application/json',
}

// 获取稳定币金库列表，按 APY 排序
export async function getStablecoinVaults(params?: {
  chainId?: number
  asset?: string
  minTvlUsd?: number
  limit?: number
  cursor?: string
}): Promise<VaultsResponse> {
  const query = new URLSearchParams()
  query.set('sortBy', 'apy')
  if (params?.chainId) query.set('chainId', String(params.chainId))
  if (params?.asset) query.set('asset', params.asset)
  if (params?.minTvlUsd) query.set('minTvlUsd', String(params.minTvlUsd))
  if (params?.limit) query.set('limit', String(params.limit))
  if (params?.cursor) query.set('cursor', params.cursor)

  const res = await fetch(`${BASE_URL}/v1/earn/vaults?${query.toString()}`, { headers })
  if (!res.ok) throw new Error(`getStablecoinVaults failed: ${res.status}`)
  return res.json()
}

// 获取单个金库详情
export async function getVault(chainId: number, address: string): Promise<Vault> {
  const res = await fetch(`${BASE_URL}/v1/earn/vaults/${chainId}/${address}`, { headers })
  if (!res.ok) throw new Error(`getVault failed: ${res.status}`)
  return res.json()
}

// 获取支持的链列表
export async function getSupportedChains(): Promise<{ name: string; chainId: number }[]> {
  const res = await fetch(`${BASE_URL}/v1/earn/chains`, { headers })
  if (!res.ok) throw new Error(`getSupportedChains failed: ${res.status}`)
  return res.json()
}

// 获取支持的协议列表
export async function getSupportedProtocols(): Promise<{ name: string; logoUri: string }[]> {
  const res = await fetch(`${BASE_URL}/v1/earn/protocols`, { headers })
  if (!res.ok) throw new Error(`getSupportedProtocols failed: ${res.status}`)
  return res.json()
}

// 获取用户所有持仓
export async function getUserPortfolio(userAddress: string): Promise<PortfolioResponse> {
  const res = await fetch(`${BASE_URL}/v1/earn/portfolio/${userAddress}/positions`, { headers })
  if (!res.ok) throw new Error(`getUserPortfolio failed: ${res.status}`)
  return res.json()
}
