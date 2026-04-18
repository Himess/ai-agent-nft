# Sepolia Deployment — 2026-04-18 (SURVIVORS, Revenue v2)

## Contract Addresses (current)

| Contract | Address |
|---|---|
| **SurvivorsNFT (AgentNFT, ERC721SeaDrop)** | `0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D` |
| **RoyaltySplitter v2 (30/70)** | `0x20095Eb151747Db649617da031F48f311f6C7e78` |
| **HolderReward** | `0x1BA36a1Ed7C4BADbA0E20273d202a20D124EefA9` |
| **AgentAccount (TBA, token #1)** | `0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A` |
| **AgentIdentity** | `0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20` |

## Deployer & Network

- Deployer / Team wallet: `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Network: Sepolia (chainId: 11155111)
- Canonical SeaDrop: `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`
- OpenSea fee recipient (allowlisted on NFT): `0x0000a26b00c1F0DF003000390027140000fAa719`

## Revenue Model (v2)

**Primary mint** (888 × price, 90% after OpenSea's 10% fee) routes **directly to the team wallet** — SeaDrop's `creatorPayoutAddress` set to the team. Splitter contract is not involved.

**Royalty** (ERC-2981, 5% of secondary sales) flows through `RoyaltySplitter`:
- **30% → Agent TBA** (`0x291E...bEc0A`)
- **70% → Team wallet** (`0xe997...Cdd2c`)

**Agent on-chain role is passive:**
- Receives its 30% royalty share
- Holds any NFTs minted on its behalf (e.g., partner project WLs team mints to the TBA)
- Does *not* autonomously move funds or call external contracts

**Holder distribution:**
- Monthly (1st of each month): `scripts/snapshot-distribute.ts` snapshots holders, builds a merkle tree, and seeds a new epoch on `HolderReward` with ETH
- First 2–3 epochs: **equal-per-NFT** split (simple, predictable)
- From epoch 3–4 onward: **time-weighted** split (rewards long-term holders)
- Holders claim via `HolderReward.claim(epochId, amount, proof)` — site provides the proof lookup
- Unclaimed funds after 60 days are reclaimable by the owner (team)

## Mint Mechanics

- MAX_SUPPLY = 888 (set via `setMaxSupply(888)` post-deploy)
- RESERVED_ALLOCATION = 88 (team vault, `reservedMint`, onlyOwner)
- Token IDs start at 1 (ERC721A convention; agent NFT = token #1)
- Primary mint driven by OpenSea SeaDrop — no user-facing mint function on our contract
- Prices: **GTD 0.0035 ETH / FCFS 0.0045 ETH / Public 0.005 ETH**
- OpenSea fee: 10% of every primary mint (handled by SeaDrop automatically)
- Royalty: 5% ERC-2981 → RoyaltySplitter (secondary sales)

## Verification Status

| Contract | Sourcify | Etherscan |
|---|---|---|
| SurvivorsNFT | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| AgentAccount | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| AgentIdentity | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| RoyaltySplitter v2 | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| HolderReward | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |

Sourcify: https://sourcify.dev/#/lookup/<address>. Etherscan verification pending an API key in `packages/contracts/.env` (`ETHERSCAN_API_KEY=...`) — free at https://etherscan.io/apis .

## Post-Deploy Checklist

- [x] NFT + core system deployed (2026-04-17)
- [x] Revenue v2 deployed: RoyaltySplitter + HolderReward (2026-04-18)
- [x] `updateCreatorPayoutAddress(seadrop, TEAM_WALLET)` — mint → team direct
- [x] `setRoyaltyInfo(newSplitter, 500)` — royalty → new splitter (30/70)
- [x] Sourcify verified (all 5 current contracts)
- [ ] Etherscan verified (needs API key)
- [ ] Approved targets on AgentAccount — reset old ones, add partner NFT contracts as needed
- [ ] `setBaseURI(...)` + `setContractURI(...)` on SurvivorsNFT
- [ ] GTD stage config via `configure-gtd.ts`
- [ ] FCFS stage config via `configure-fcfs.ts`
- [ ] Public stage config via `configure-public.ts`
- [ ] Drop URI for OpenSea Studio metadata (`updateDropURI`)

## Explorer Links

- SurvivorsNFT: https://sepolia.etherscan.io/address/0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D
- RoyaltySplitter v2: https://sepolia.etherscan.io/address/0x20095Eb151747Db649617da031F48f311f6C7e78
- HolderReward: https://sepolia.etherscan.io/address/0x1BA36a1Ed7C4BADbA0E20273d202a20D124EefA9
- AgentAccount: https://sepolia.etherscan.io/address/0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A
- AgentIdentity: https://sepolia.etherscan.io/address/0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20

## Superseded Contracts

- **RevenueSplitter v1 (50/20/30)** at `0x9F066Bdc1aB9560c0052283ED5C5470F43AE252B` — superseded by RoyaltySplitter v2 after the revenue model change on 2026-04-18. No funds routed through it (deployed but never funded). Safe to ignore.

## Superseded Deployments (full)

### 2026-04-17 (pre-SeaDrop, GTD/FCFS custom contract) — abandoned
- SurvivorsNFT: `0x284523FA71945D2d2aE6acD28B7f37FdDD0f81bC`
- RevenueSplitter: `0xd467948638Ac535658C551A6996a868DAA689035`
- AgentAccount: `0xB91F46A86D0b454Bd0Cfe4AB709ec7FA887742eE`
- AgentIdentity: `0x0651e513709f3EA92F504fE73006f54C98639Dce`

### 2026-04-10 (pre-rebrand, 1000 supply) — abandoned
- AgentNFT: `0x2B8314d0D31314907cC8F94Cb6972bF37a292bc0`
- RevenueSplitter: `0x0Cc3f65E7E0D14F5A8A433d23f1Fa532d4C39053`
- AgentAccount: `0x5dd1961cEF2E9ae81dC4FB87fA561E624d2D502a`
- AgentIdentity: `0xDD722af18a0b4B96AC3bb48a8b038BF03b688e80`
