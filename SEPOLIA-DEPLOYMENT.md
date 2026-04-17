# Sepolia Deployment — 2026-04-17 (SURVIVORS, SeaDrop-based)

## Contract Addresses (current — SeaDrop build)

| Contract | Address |
|---|---|
| **SurvivorsNFT (AgentNFT, ERC721SeaDrop)** | `0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D` |
| **RevenueSplitter** | `0x9F066Bdc1aB9560c0052283ED5C5470F43AE252B` |
| **AgentAccount (TBA, token #1)** | `0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A` |
| **AgentIdentity** | `0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20` |

## Deployer & Network

- Deployer: `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Network: Sepolia (chainId: 11155111)
- Canonical SeaDrop: `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`
- OpenSea fee recipient (allowlisted): `0x0000a26b00c1F0DF003000390027140000fAa719`

## Revenue Split (RevenueSplitter)

- Agent TBA (50%): `0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A`
- Founder1  (20%): `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Founder2  (30%): `0xF505e2E71df58D7244189072008f25f6b6aaE5ae`

## Mint Mechanics

- MAX_SUPPLY = 888 (set via `setMaxSupply(888)` post-deploy)
- RESERVED_ALLOCATION = 88 (team vault, `reservedMint`, onlyOwner)
- Token IDs start at 1 (ERC721A convention; agent NFT = token #1)
- Primary mint driven by OpenSea SeaDrop — the token contract does not expose a
  user-facing mint function. Stage configuration via:
  - `updatePublicDrop(seadrop, PublicDrop)` — open public stage
  - `updateAllowList(seadrop, AllowListData)` — GTD + FCFS presale stages (time-gated, own merkle root each)
- Prices: **GTD 0.0035 ETH / FCFS 0.0045 ETH / Public 0.005 ETH** (subject to confirmation)
- OpenSea fee: 10% of every primary mint (handled by SeaDrop automatically)
- Royalty: 5% ERC-2981 → RevenueSplitter (secondary sales)

## Verification Status

| Contract | Sourcify | Etherscan |
|---|---|---|
| SurvivorsNFT | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| RevenueSplitter | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| AgentAccount | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |
| AgentIdentity | ✅ perfect | ⏳ needs ETHERSCAN_API_KEY |

All four contracts are verifiable on Sourcify at
https://sourcify.dev/#/lookup/<address> with "perfect" status (full metadata match).
Etherscan verification is pending an API key in `packages/contracts/.env`
(`ETHERSCAN_API_KEY=...`) — free at https://etherscan.io/apis .

## Post-Deploy Checklist

- [x] All 4 contracts deployed
- [x] `setMaxSupply(888)` on AgentNFT
- [x] Agent NFT token #1 minted to deployer (team vault seat)
- [x] RevenueSplitter wired as creator payout (`updateCreatorPayoutAddress`)
- [x] OS fee recipient allowlisted (`updateAllowedFeeRecipient`)
- [x] ERC-2981 royalty receiver = RevenueSplitter (5%)
- [x] Agent identity registered and verified
- [x] Deployer authorized as reputation updater
- [x] Sourcify source verification (all 4)
- [ ] Etherscan verification (needs API key)
- [ ] Approved targets configured on AgentAccount
- [ ] `setBaseURI(...)` + `setContractURI(...)` on AgentNFT
- [ ] GTD stage config via `configure-gtd.ts`
- [ ] FCFS stage config via `configure-fcfs.ts`
- [ ] Public stage config via `configure-public.ts`
- [ ] Drop URI for OpenSea Studio metadata (`updateDropURI`)

## Explorer Links

- SurvivorsNFT: https://sepolia.etherscan.io/address/0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D
- RevenueSplitter: https://sepolia.etherscan.io/address/0x9F066Bdc1aB9560c0052283ED5C5470F43AE252B
- AgentAccount: https://sepolia.etherscan.io/address/0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A
- AgentIdentity: https://sepolia.etherscan.io/address/0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20

Sourcify (full source verified):
- SurvivorsNFT: https://sourcify.dev/#/lookup/0xe192E5ba10D7b4d44b16a122Fb0Bf0D020831A2D
- RevenueSplitter: https://sourcify.dev/#/lookup/0x9F066Bdc1aB9560c0052283ED5C5470F43AE252B
- AgentAccount: https://sourcify.dev/#/lookup/0x291E7dFDB4387a784350D09d1d144DDC2A1bEc0A
- AgentIdentity: https://sourcify.dev/#/lookup/0x565F782fB1A8609Ed19E93E4a33b9D3C0d1ADd20

## Superseded Deployments

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
