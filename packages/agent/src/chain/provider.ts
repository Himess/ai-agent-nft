import { ethers } from "ethers";
import { getConfig } from "../config.js";

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;

export function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(getConfig().RPC_URL);
  }
  return _provider;
}

export function getSigner(): ethers.Wallet {
  if (!_signer) {
    _signer = new ethers.Wallet(getConfig().AGENT_PRIVATE_KEY, getProvider());
  }
  return _signer;
}
