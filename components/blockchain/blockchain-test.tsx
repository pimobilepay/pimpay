"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { getContract } from "@/lib/blockchain";

export function BlockchainTest() {
  const [balance, setBalance] = useState("0");

  const checkBalance = async () => {
    try {
      if (!window.ethereum) throw new Error("Installez Metamask");

      // 1. Connexion au portefeuille
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // 2. Appel du contrat
      const contract = getContract(signer);
      const userAddress = await signer.getAddress();
      
      const tx = await contract.balanceTable(userAddress);
      setBalance(ethers.formatEther(tx));
    } catch (error) {
      console.error("Erreur blockchain:", error);
    }
  };

  return (
    <div className="p-4 bg-slate-900 rounded-2xl border border-white/5">
      <p className="text-white font-bold">Solde Contrat: {balance} PI</p>
      <button onClick={checkBalance} className="mt-2 bg-blue-600 px-4 py-2 rounded-xl text-xs">
        Actualiser
      </button>
    </div>
  );
}
