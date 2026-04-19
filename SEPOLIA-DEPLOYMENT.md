# Sepolia Deployment — 2026-04-17 (SURVIVORS 1111, Ashborn)

## Contract Addresses (current)

| Contract | Address |
|---|---|
| **SurvivorsNFT (AgentNFT, ERC721SeaDrop)** | `0xE8BaC7533dacB7c333015Fc9aCffc48d795AFD9d` |
| **RevenueSplitter (50/20/30 legacy)** | `0x3FC9902C4ad3EF802929Bc69b5E773Fb76640be4` |
| **AgentAccount (TBA, token #1)** | `0xF4E199AD166BDaE47380fbB5D9eDEbaE0da6f697` |
| **AgentIdentity** | `0x9D3C49b9E525860F41551dE2566105b165262f12` |

## Deployer & Network

- Deployer / Team wallet: `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Network: Sepolia (chainId: 11155111)
- Canonical SeaDrop: `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`
- OpenSea fee recipient (allowlisted on NFT): `0x0000a26b00c1F0DF003000390027140000fAa719`

## Mint Mechanics

- MAX_SUPPLY = 1111 (set via `setMaxSupply(1111)` post-deploy)
- RESERVED_ALLOCATION = 100 (team vault, `reservedMint`, onlyOwner)
- Token IDs start at 1 (ERC721A; agent NFT = token #1)
- Primary mint driven by OpenSea SeaDrop (no user-facing mint on our contract)
- Prices: **GTD 0.0035 ETH / FCFS 0.0045 ETH / Public 0.005 ETH**
- OpenSea fee: 10% of every primary mint (handled by SeaDrop)
- Royalty: 5% ERC-2981 routed to RevenueSplitter (secondary sales)

## Allocation Plan (1111 total)

| Source | GTD | FCFS | Notes |
|---|---:|---:|---|
| Team reserved vault | — | — | 100 via `reservedMint` (not allowlist) |
| Quiz (on-site, agent-scored) | 200 | 100 | |
| Application (on-site, agent-scored) | 450 | 0 | |
| Community / partner collab | 100 | 100 | |
| Yan (team alt wallets) | 120 | 0 | |
| @ashborn_agent Twitter picks | 50 | 50 | |
| @survivorsoneth Twitter picks | 50 | 50 | |
| **Totals** | **970** | **300** | Reserved 100 + GTD 970 + FCFS 300 = 1370 offered (oversubscribed ~23%) |

Allowlist overflow is expected. On-chain MAX_SUPPLY=1111 is the hard cap; first to mint wins.

## Revenue Model (initial)

This redeploy uses the original `RevenueSplitter` contract:
- **50% → Agent TBA** (`0xF4E1...f697`)
- **20% → Founder1** (`0xe997...Cdd2c`)
- **30% → Founder2** (`0xF505...E5ae`)

v2 scripts (`deploy-revenue-v2.ts`: 30% agent / 70% team + `HolderReward`) can be layered on later if desired; current deploy is clean-slate.

## Post-Deploy Checklist

- [x] NFT + core system deployed (2026-04-17, supply 1111)
- [ ] Sourcify verification
- [ ] Etherscan verification (ETHERSCAN_API_KEY is set)
- [ ] Approved targets on AgentAccount (scripts/set-approved-targets etc.)
- [ ] `setBaseURI(...)` + `setContractURI(...)` on SurvivorsNFT
- [ ] GTD stage config via `configure-gtd.ts` (after merkle tree built)
- [ ] FCFS stage config via `configure-fcfs.ts` (after merkle tree built)
- [ ] Public stage config via `configure-public.ts`
- [ ] Drop URI for OpenSea Studio metadata (`updateDropURI`)

## Explorer Links

- SurvivorsNFT: https://sepolia.etherscan.io/address/0xE8BaC7533dacB7c333015Fc9aCffc48d795AFD9d
- RevenueSplitter: https://sepolia.etherscan.io/address/0x3FC9902C4ad3EF802929Bc69b5E773Fb76640be4
- AgentAccount: https://sepolia.etherscan.io/address/0xF4E199AD166BDaE47380fbB5D9eDEbaE0da6f697
- AgentIdentity: https://sepolia.etherscan.io/address/0x9D3C49b9E525860F41551dE2566105b165262f12

## Superseded Deployments

### 2026-04-18 (SURVIVORS 888, Revenue v2 — abandoned after supply bump to 1111)
- SurvivorsNFT: `0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D`
- RoyaltySplitter v2 (30/70): `0x20095Eb151747Db649617da031F48f311f6C7e78`
- HolderReward: `0x1BA36a1Ed7C4BADbA0E20273d202a20D124EefA9`
- AgentAccount: `0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A`
- AgentIdentity: `0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20`
- RevenueSplitter v1: `0x9F066Bdc1aB9560c0052283ED5C5470F43AE252B` (never funded)

### 2026-04-17 (pre-SeaDrop, GTD/FCFS custom contract)
- SurvivorsNFT: `0x284523FA71945D2d2aE6acD28B7f37FdDD0f81bC`
- RevenueSplitter: `0xd467948638Ac535658C551A6996a868DAA689035`
- AgentAccount: `0xB91F46A86D0b454Bd0Cfe4AB709ec7FA887742eE`
- AgentIdentity: `0x0651e513709f3EA92F504fE73006f54C98639Dce`

### 2026-04-10 (pre-rebrand, 1000 supply)
- AgentNFT: `0x2B8314d0D31314907cC8F94Cb6972bF37a292bc0`
- RevenueSplitter: `0x0Cc3f65E7E0D14F5A8A433d23f1Fa532d4C39053`
- AgentAccount: `0x5dd1961cEF2E9ae81dC4FB87fA561E624d2D502a`
- AgentIdentity: `0xDD722af18a0b4B96AC3bb48a8b038BF03b688e80`
