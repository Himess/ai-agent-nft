import { ethers } from "ethers";

const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const DEPLOYER_ADDRESS = "0xe997d18AfF727892e171b66E9E20471fbb2Cdd2c";
const FUNDING_AMOUNT = "0.2"; // ETH

async function main() {
  const funderKey = process.env.FUNDER_PRIVATE_KEY;
  if (!funderKey) throw new Error("Set FUNDER_PRIVATE_KEY env var");

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const funder = new ethers.Wallet(funderKey, provider);

  console.log(`Funder:   ${funder.address}`);
  const balance = await provider.getBalance(funder.address);
  console.log(`Balance:  ${ethers.formatEther(balance)} ETH`);

  const deployerBal = await provider.getBalance(DEPLOYER_ADDRESS);
  console.log(`Deployer: ${DEPLOYER_ADDRESS}`);
  console.log(`Deployer balance: ${ethers.formatEther(deployerBal)} ETH`);

  if (balance < ethers.parseEther(FUNDING_AMOUNT)) {
    console.log(`\nInsufficient balance. Need ${FUNDING_AMOUNT} ETH.`);
    return;
  }

  console.log(`\nSending ${FUNDING_AMOUNT} ETH to deployer...`);

  const tx = await funder.sendTransaction({
    to: DEPLOYER_ADDRESS,
    value: ethers.parseEther(FUNDING_AMOUNT),
  });

  console.log(`TX hash: ${tx.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt!.blockNumber}`);

  const newBal = await provider.getBalance(DEPLOYER_ADDRESS);
  console.log(`\nDeployer new balance: ${ethers.formatEther(newBal)} ETH`);
}

main().catch(console.error);
