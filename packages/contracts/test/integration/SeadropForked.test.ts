import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { buildSeadropMerkle } from "../helpers/fixtures";
import {
  GTD_PRICE,
  FEE_BPS,
  MAX_PER_WALLET,
  MAX_SUPPLY,
  GTD_STAGE_INDEX,
  SEADROP_ADDRESS,
  OS_FEE_RECIPIENT,
  RESTRICT_FEE_RECIPIENTS,
  gtdMintParams,
} from "../../config/drop-config";

// End-to-end proof that our ERC721SeaDrop token works against the real
// SeaDrop contract deployed on Sepolia. The test forks Sepolia, deploys
// fresh contracts, wires the GTD stage, and mints via `SeaDrop.mintAllowList`.
//
// Prefers `ALCHEMY_API_KEY` (archive-capable) but falls back to
// publicnode's Sepolia RPC so contributors can run it without credentials.
// Set `SKIP_FORK_TEST=1` to skip this suite entirely.

const apiKey = process.env.ALCHEMY_API_KEY;
const forkRpcUrl = apiKey
  ? `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
  : "https://ethereum-sepolia-rpc.publicnode.com";
const shouldSkip = process.env.SKIP_FORK_TEST === "1";
const suite = shouldSkip ? describe.skip : describe;

suite("SeaDrop forked Sepolia — GTD mint flow", function () {
  this.timeout(180_000);

  let snapshotId: string;

  before(async function () {
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: forkRpcUrl,
          },
        },
      ],
    });
    snapshotId = (await hre.network.provider.request({
      method: "evm_snapshot",
      params: [],
    })) as string;
  });

  after(async function () {
    // Revert to an unforked hardhat network so other suites (if any) are
    // unaffected when running multiple test files in a single process.
    await hre.network.provider.request({
      method: "hardhat_reset",
      params: [],
    });
  });

  beforeEach(async function () {
    // Re-apply the fork snapshot so each test gets a clean state.
    await hre.network.provider.request({
      method: "evm_revert",
      params: [snapshotId],
    });
    snapshotId = (await hre.network.provider.request({
      method: "evm_snapshot",
      params: [],
    })) as string;
  });

  async function deployFreshStack() {
    const [deployer, founder1, founder2, minter, outsider] =
      await ethers.getSigners();

    const AgentNFT = await ethers.getContractFactory("AgentNFT");
    const nft = await AgentNFT.deploy("SURVIVORS", "SVVR", [SEADROP_ADDRESS]);
    await nft.waitForDeployment();
    await (await nft.setMaxSupply(MAX_SUPPLY)).wait();

    // Reserved mint the agent NFT to deployer (token #1).
    await (await nft.reservedMint(deployer.address, 1)).wait();

    const RevenueSplitter = await ethers.getContractFactory("RevenueSplitter");
    const splitter = await RevenueSplitter.deploy(
      deployer.address, // stand-in for TBA in this test (we don't deploy AgentAccount)
      founder1.address,
      founder2.address
    );
    await splitter.waitForDeployment();

    // Bootstrap SeaDrop wiring on the token.
    await (
      await nft.updateCreatorPayoutAddress(SEADROP_ADDRESS, await splitter.getAddress())
    ).wait();
    await (
      await nft.updateAllowedFeeRecipient(SEADROP_ADDRESS, OS_FEE_RECIPIENT, true)
    ).wait();

    // Point the ERC-2981 secondary royalty at the splitter too.
    await (
      await nft.setRoyaltyInfo({
        royaltyAddress: await splitter.getAddress(),
        royaltyBps: 500,
      })
    ).wait();

    const seadrop = await ethers.getContractAt("ISeaDrop", SEADROP_ADDRESS);

    return { nft, splitter, seadrop, deployer, founder1, founder2, minter, outsider };
  }

  it("mintAllowList: allowlisted wallet mints 1 NFT, payment splits correctly", async function () {
    const { nft, splitter, seadrop, deployer, minter, outsider } =
      await deployFreshStack();

    // Window spans this test's execution. block.timestamp after fork is real Sepolia time.
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = BigInt(latestBlock!.timestamp);
    const startTime = now - 60n;
    const endTime = now + 60n * 60n; // +1h

    const addresses = [minter.address, deployer.address];
    const params = gtdMintParams({ startTime, endTime });
    const { root, proofFor } = buildSeadropMerkle(addresses, params);

    // Configure the GTD stage on the token (forwarded to SeaDrop).
    await (
      await nft.updateAllowList(SEADROP_ADDRESS, {
        merkleRoot: root,
        publicKeyURIs: [],
        allowListURI: "",
      })
    ).wait();

    const proof = proofFor(minter.address);
    const mintParamsTuple = [
      params.mintPrice,
      params.maxTotalMintableByWallet,
      params.startTime,
      params.endTime,
      params.dropStageIndex,
      params.maxTokenSupplyForStage,
      params.feeBps,
      params.restrictFeeRecipients,
    ];

    const splitterBefore = await ethers.provider.getBalance(
      await splitter.getAddress()
    );
    const osFeeBefore = await ethers.provider.getBalance(OS_FEE_RECIPIENT);

    await (
      await seadrop
        .connect(minter)
        .mintAllowList(
          await nft.getAddress(),
          OS_FEE_RECIPIENT,
          ethers.ZeroAddress,
          1,
          mintParamsTuple,
          proof,
          { value: GTD_PRICE }
        )
    ).wait();

    // Token #1 was reserved-minted to deployer; minter receives token #2.
    expect(await nft.balanceOf(minter.address)).to.equal(1);
    expect(await nft.ownerOf(2)).to.equal(minter.address);

    // Payment split: 10% OS fee, 90% creator payout (to the splitter).
    const fee = (GTD_PRICE * BigInt(FEE_BPS)) / 10_000n;
    const creatorShare = GTD_PRICE - fee;

    const splitterAfter = await ethers.provider.getBalance(
      await splitter.getAddress()
    );
    const osFeeAfter = await ethers.provider.getBalance(OS_FEE_RECIPIENT);

    expect(splitterAfter - splitterBefore).to.equal(creatorShare);
    expect(osFeeAfter - osFeeBefore).to.equal(fee);

    // Second mint from same wallet rejected — maxTotalMintableByWallet = 1.
    await expect(
      seadrop
        .connect(minter)
        .mintAllowList(
          await nft.getAddress(),
          OS_FEE_RECIPIENT,
          ethers.ZeroAddress,
          1,
          mintParamsTuple,
          proof,
          { value: GTD_PRICE }
        )
    ).to.be.reverted;

    // Non-allowlisted wallet rejected.
    await expect(
      seadrop.connect(outsider).mintAllowList(
        await nft.getAddress(),
        OS_FEE_RECIPIENT,
        ethers.ZeroAddress,
        1,
        mintParamsTuple,
        proof, // minter's proof, not outsider's
        { value: GTD_PRICE }
      )
    ).to.be.reverted;
  });

  it("rejects mint with wrong payment", async function () {
    const { nft, seadrop, minter } = await deployFreshStack();

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = BigInt(latestBlock!.timestamp);
    const params = gtdMintParams({ startTime: now - 60n, endTime: now + 3600n });
    const { root, proofFor } = buildSeadropMerkle([minter.address], params);

    await (
      await nft.updateAllowList(SEADROP_ADDRESS, {
        merkleRoot: root,
        publicKeyURIs: [],
        allowListURI: "",
      })
    ).wait();

    const mintParamsTuple = [
      params.mintPrice,
      params.maxTotalMintableByWallet,
      params.startTime,
      params.endTime,
      params.dropStageIndex,
      params.maxTokenSupplyForStage,
      params.feeBps,
      params.restrictFeeRecipients,
    ];

    // Underpay by 1 wei → SeaDrop reverts.
    await expect(
      seadrop
        .connect(minter)
        .mintAllowList(
          await nft.getAddress(),
          OS_FEE_RECIPIENT,
          ethers.ZeroAddress,
          1,
          mintParamsTuple,
          proofFor(minter.address),
          { value: GTD_PRICE - 1n }
        )
    ).to.be.reverted;
  });

  it("rejects mint outside time window", async function () {
    const { nft, seadrop, minter } = await deployFreshStack();

    const latestBlock = await ethers.provider.getBlock("latest");
    const now = BigInt(latestBlock!.timestamp);
    // Stage starts in the future.
    const params = gtdMintParams({
      startTime: now + 3600n,
      endTime: now + 7200n,
    });
    const { root, proofFor } = buildSeadropMerkle([minter.address], params);

    await (
      await nft.updateAllowList(SEADROP_ADDRESS, {
        merkleRoot: root,
        publicKeyURIs: [],
        allowListURI: "",
      })
    ).wait();

    const mintParamsTuple = [
      params.mintPrice,
      params.maxTotalMintableByWallet,
      params.startTime,
      params.endTime,
      params.dropStageIndex,
      params.maxTokenSupplyForStage,
      params.feeBps,
      params.restrictFeeRecipients,
    ];

    await expect(
      seadrop
        .connect(minter)
        .mintAllowList(
          await nft.getAddress(),
          OS_FEE_RECIPIENT,
          ethers.ZeroAddress,
          1,
          mintParamsTuple,
          proofFor(minter.address),
          { value: GTD_PRICE }
        )
    ).to.be.reverted;
  });
});
