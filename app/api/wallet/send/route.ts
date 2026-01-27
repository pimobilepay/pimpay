import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { ethers } from "ethers";
import { TransactionStatus, TransactionType } from "@prisma/client";
import { isValidTronAddress } from "@/lib/tron-utils"; // Import de ton nouvel utilitaire

const SIDRA_RPC = "https://rpc.sidrachain.com";

export async function POST(req: Request) {
  try {
    const { to, amount, currency = "SDA" } = await req.json();
    const token = cookies().get("pimpay_token")?.value;

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    // 1. Récupérer l'utilisateur avec ses wallets
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallets: true }
    });

    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });

    // Trouver le wallet correspondant à la devise
    const selectedWallet = user.wallets.find(w => w.currency === currency.toUpperCase());
    const reference = `TX-${currency.toUpperCase()}-${Date.now()}`;

    // 2. Création de la transaction initiale en base (PENDING)
    const dbTransaction = await prisma.transaction.create({
      data: {
        reference,
        amount: parseFloat(amount),
        currency: currency.toUpperCase(),
        type: TransactionType.TRANSFER,
        status: TransactionStatus.PENDING,
        fromUserId: userId,
        description: `Envoi ${currency} vers ${to}`,
        fromWalletId: selectedWallet?.id // Peut être undefined si le wallet n'existe pas encore
      }
    });

    try {
      let txHash = "";

      // --- LOGIQUE MULTI-BLOCKCHAIN (STRUCTURE PIMPAY) ---

      if (currency.toUpperCase() === "SDA") {
        if (!user.sidraPrivateKey) throw new Error("Clé privée Sidra manquante");
        
        const provider = new ethers.JsonRpcProvider(SIDRA_RPC);
        const wallet = new ethers.Wallet(user.sidraPrivateKey, provider);
        const amountInWei = ethers.parseEther(amount.toString());

        const tx = await wallet.sendTransaction({ to, value: amountInWei });
        const receipt = await tx.wait();
        txHash = receipt?.hash || "";

      } else if (currency.toUpperCase() === "USDT") {
        // --- STRUCTURE TRON (TRC-20) ---
        // Utilisation de l'utilitaire bb !
        if (!isValidTronAddress(to)) {
          throw new Error("L'adresse de destination TRON est invalide (Structure Base58Check)");
        }
        
        // Simulation pour le moment, en attendant l'intégration de TronWeb
        txHash = `TRX_SIM_${Date.now()}`; 

      } else if (currency.toUpperCase() === "PI") {
        // --- STRUCTURE PI NETWORK ---
        txHash = `PI_SIM_${Date.now()}`;
      } else {
        throw new Error(`Le réseau ${currency} n'est pas encore supporté par PimPay`);
      }

      // 3. Mise à jour finale en cas de SUCCÈS
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          blockchainTx: txHash,
        }
      });

      return NextResponse.json({
        success: true,
        hash: txHash,
        message: `Transfert ${currency} réussi`
      });

    } catch (blockchainError: any) {
      // 4. Gestion de l'échec Blockchain (Marquage en DB pour la banque)
      await prisma.transaction.update({
        where: { id: dbTransaction.id },
        data: { 
          status: TransactionStatus.FAILED, 
          note: blockchainError.message 
        }
      });
      return NextResponse.json({ error: blockchainError.message }, { status: 400 });
    }

  } catch (error: any) {
    console.error("SEND_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur PimPay", details: error.message }, { status: 500 });
  }
}
