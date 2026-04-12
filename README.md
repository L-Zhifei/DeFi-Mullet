# Yield Earner API

DeFi Mullet Hackathon 项目的后端 API 集成层，对接 LI.FI 的 Earn Data API 和 Composer API。

---

## 文件结构

```
yield-earner-api/
├── types.ts        # 数据类型定义
├── earnApi.ts      # Earn Data API 请求函数
├── composerApi.ts  # Composer 交易构建函数
└── README.md
```

---

## types.ts

定义所有数据结构类型，供其他两个文件使用。

| 类型 | 说明 |
|------|------|
| `Vault` | 金库对象，包含地址、协议、APY、TVL 等信息 |
| `VaultsResponse` | 金库列表接口返回格式，包含 data 数组和 total 总数 |
| `VaultAnalytics` | 金库的收益分析数据，包含 apy、tvl、历史 apy |
| `Position` | 用户在某个金库的持仓信息 |
| `PortfolioResponse` | 用户持仓列表接口返回格式 |
| `QuoteRequest` | 发起 Composer 交易时的请求参数 |
| `QuoteResponse` | Composer 返回的待签名交易数据 |

---

## earnApi.ts

对接 **Earn Data API**（`https://earn.li.fi`），负责查询数据，不涉及链上操作。

### `getStablecoinVaults(params?)`
获取稳定币金库列表，默认按 APY 从高到低排序。

```ts
const result = await getStablecoinVaults({ asset: 'USDC', limit: 20 })
// result.data → 金库数组
// result.total → 总数量（159个）
```

参数：
- `asset` — 代币符号，如 `"USDC"`、`"USDT"`
- `chainId` — 链 ID，如 `1`（Ethereum）、`8453`（Base）
- `minTvlUsd` — 最低 TVL 门槛，过滤小金库
- `limit` — 每页数量，默认 50
- `cursor` — 翻页用的游标

---

### `getVault(chainId, address)`
获取某个金库的详细信息。

```ts
const vault = await getVault(1, '0x9b5e92fd...')
// 返回单个 Vault 对象
```

---

### `getSupportedChains()`
获取 LI.FI Earn 支持的所有区块链列表。

```ts
const chains = await getSupportedChains()
// [{ name: 'Ethereum', chainId: 1 }, { name: 'Base', chainId: 8453 }, ...]
```

---

### `getSupportedProtocols()`
获取所有支持的 DeFi 协议列表（Morpho、Aave、Euler 等）。

```ts
const protocols = await getSupportedProtocols()
// [{ name: 'morpho-v1', logoUri: '...' }, ...]
```

---

### `getUserPortfolio(userAddress)`
获取某个钱包地址在所有协议的持仓和收益情况。

```ts
const portfolio = await getUserPortfolio('0xYourWalletAddress')
// portfolio.positions → 持仓数组，每个包含金库信息和余额
```

---

## composerApi.ts

对接 **Composer API**（`https://li.quest`），负责构建链上交易，返回待签名的交易数据给前端钱包执行。

### `buildDepositQuote(params)`
构建**存入**金库的交易。用户选好金库后，调用此函数生成交易，前端用钱包签名后发送上链。

```ts
const quote = await buildDepositQuote({
  fromChainId: 8453,           // 用户当前所在的链（Base）
  fromTokenAddress: '0x833589...', // 用户持有的 USDC 地址
  fromAmount: '100000000',     // 100 USDC（6位小数）
  fromAddress: '0xUserWallet', // 用户钱包地址
  vaultChainId: 8453,          // 金库所在的链
  vaultAddress: '0xVault...',  // 目标金库地址
})
// quote.transactionRequest → 传给钱包签名并发送
```

---

### `buildWithdrawQuote(params)`
构建**取出**金库资产的交易。

```ts
const quote = await buildWithdrawQuote({
  fromChainId: 8453,
  vaultAddress: '0xVault...',   // 从哪个金库取出
  fromAmount: '100000000',      // 取出数量
  fromAddress: '0xUserWallet',
  toTokenAddress: '0x833589...', // 希望收到的代币
})
// quote.transactionRequest → 传给钱包签名并发送
```

---

## 使用的 API

| API | 地址 | 认证 |
|-----|------|------|
| Earn Data API | `https://earn.li.fi` | `x-lifi-api-key` header |
| Composer API | `https://li.quest` | `x-lifi-api-key` header |
