import { ethers } from "ethers";

const wallet = ethers.Wallet.createRandom();

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("  NEW DEPLOYER WALLET");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Address:     ${wallet.address}`);
console.log(`  Private Key: ${wallet.privateKey}`);
console.log(`  Mnemonic:    ${wallet.mnemonic?.phrase}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("");
console.log("  IMPORTANT: Save the private key and mnemonic securely!");
console.log("  Never share them. Never commit to git.");
console.log("");
console.log("  Next steps:");
console.log("  1. Copy the private key to .env as DEPLOYER_PRIVATE_KEY");
console.log("  2. Send Sepolia ETH to the address above");
console.log("     - https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
console.log("     - https://www.alchemy.com/faucets/ethereum-sepolia");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
