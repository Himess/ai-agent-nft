# Sepolia Deployment — 2026-04-17 (SURVIVORS, GTD/FCFS)

## Contract Addresses (current)

| Contract | Address |
|---|---|
| **SurvivorsNFT (AgentNFT)** | `0x284523FA71945D2d2aE6acD28B7f37FdDD0f81bC` |
| **RevenueSplitter** | `0xd467948638Ac535658C551A6996a868DAA689035` |
| **AgentAccount (TBA)** | `0xB91F46A86D0b454Bd0Cfe4AB709ec7FA887742eE` |
| **AgentIdentity** | `0x0651e513709f3EA92F504fE73006f54C98639Dce` |

## Deployer

- Address: `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Network: Sepolia (chainId: 11155111)

## Revenue Split

- Agent TBA (50%): `0xB91F46A86D0b454Bd0Cfe4AB709ec7FA887742eE`
- Founder1 (20%): `0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c`
- Founder2 (30%): `0xF505e2E71df58D7244189072008f25f6b6aaE5ae`

## Mint Mechanics

- MAX_SUPPLY = 888
- RESERVED_ALLOCATION = 88 (team vault, `reservedMint`, onlyOwner)
- Phase enum: `{ Closed=0, GTD=1, FCFS=2, Public=3 }`
- Two merkle roots: `gtdMerkleRoot` + `fcfsMerkleRoot`
- 1 mint per wallet per phase (`mintedInGTD` / `mintedInFCFS` / `mintedInPublic`)
- Mint price: 0.01 ETH (placeholder, `setMintPrice` to change)
- Royalty: 5% (ERC-2981, goes to RevenueSplitter)

## Post-Deploy Checklist

- [x] All 4 contracts deployed
- [x] Agent NFT token #0 minted to deployer (vault seat)
- [x] RevenueSplitter configured on AgentNFT
- [x] Agent identity registered and verified
- [x] Deployer added as authorized reputation updater
- [ ] Etherscan verification (`npx hardhat verify --network sepolia <addr> <args>`)
- [ ] Approved targets configured on AgentAccount
- [ ] Base URI set on AgentNFT (`setBaseURI("ipfs://<cid>/")`)
- [ ] GTD merkle root set (`setGTDMerkleRoot(rootGTD)`)
- [ ] FCFS merkle root set (`setFCFSMerkleRoot(rootFCFS)`)
- [ ] Mint enabled (phase transitions: `setPhase(1)` → `setPhase(2)` → `setPhase(3)`)

## Etherscan Links

- SurvivorsNFT: https://sepolia.etherscan.io/address/0x284523FA71945D2d2aE6acD28B7f37FdDD0f81bC
- RevenueSplitter: https://sepolia.etherscan.io/address/0xd467948638Ac535658C551A6996a868DAA689035
- AgentAccount: https://sepolia.etherscan.io/address/0xB91F46A86D0b454Bd0Cfe4AB709ec7FA887742eE
- AgentIdentity: https://sepolia.etherscan.io/address/0x0651e513709f3EA92F504fE73006f54C98639Dce

## Previous Deployment (superseded 2026-04-17)

| Contract | Address | Status |
|---|---|---|
| AgentNFT (pre-rebrand, 1000 supply) | `0x2B8314d0D31314907cC8F94Cb6972bF37a292bc0` | Abandoned |
| RevenueSplitter | `0x0Cc3f65E7E0D14F5A8A433d23f1Fa532d4C39053` | Abandoned |
| AgentAccount | `0x5dd1961cEF2E9ae81dC4FB87fA561E624d2D502a` | Abandoned |
| AgentIdentity | `0xDD722af18a0b4B96AC3bb48a8b038BF03b688e80` | Abandoned |
