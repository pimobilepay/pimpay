// lib/blockchain/sidra.ts
import { ethers } from "ethers";

export const getSidraBalance = async (address: string) => {
  try {
    const provider = new ethers.JsonRpcProvider("https://node.sidrachain.com");
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Erreur Sidra:", error);
    return "0";
  }
};
