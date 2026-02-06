export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Wallet as EthersWallet } from "ethers";
import crypto from "crypto";

const generateBlockchainIdentities = () => {
    const sidraWallet = EthersWallet.createRandom();
    const usdtPrivKey = crypto.randomBytes(32).toString('hex');
    const usdtAddr = `T${crypto.randomBytes(20).toString('hex').substring(0, 33)}`;
    const piPrivKey = crypto.randomBytes(32).toString('hex');
    const piAddr = `P${crypto.randomBytes(20).toString('hex').toUpperCase()}`;
    
    return {
        sidra: { address: sidraWallet.address, privateKey: sidraWallet.privateKey },
        usdt: { address: usdtAddr, privateKey: usdtPrivKey },
        pi: { address: piAddr, privateKey: piPrivKey }
    };
};

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const piToken = cookieStore.get("pi_session_token")?.value;
        const classicToken = cookieStore.get("token")?.value;
        let userId: string | null = null;

        if (piToken) {
            userId = piToken;
        } else if (classicToken) {
            try {
                const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
                const { payload } = await jwtVerify(classicToken, secret);
                userId = (payload.id || payload.userId) as string;
            } catch (e) {
                return NextResponse.json({ error: "Session expirée" }, { status: 401 });
            }
        }

        if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallets: true, virtualCards: true }
        });

        if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

        // --- SYNCHRONISATION DES WALLETS ---
        const hasXafWallet = user.wallets.some(w => w.currency === "XAF");
        if (!user.sidraAddress || !user.usdtAddress || !user.walletAddress || !hasXafWallet) {
            const ids = generateBlockchainIdentities();
            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    sidraAddress: user.sidraAddress || ids.sidra.address,
                    sidraPrivateKey: user.sidraPrivateKey || ids.sidra.privateKey,
                    usdtAddress: user.usdtAddress || ids.usdt.address,
                    usdtPrivateKey: user.usdtPrivateKey || ids.usdt.privateKey,
                    walletAddress: user.walletAddress || ids.pi.address,
                    wallets: {
                        connectOrCreate: [
                            { where: { userId_currency: { userId, currency: "XAF" } }, create: { currency: "XAF", balance: 0, type: "FIAT" } },
                            { where: { userId_currency: { userId, currency: "PI" } }, create: { currency: "PI", balance: 0, type: "PI" } },
                            { where: { userId_currency: { userId, currency: "SIDRA" } }, create: { currency: "SIDRA", balance: 0, type: "SIDRA" } },
                            { where: { userId_currency: { userId, currency: "USDT" } }, create: { currency: "USDT", balance: 0, type: "CRYPTO" } }
                        ]
                    }
                },
                include: { wallets: true, virtualCards: true }
            });
        }

        // --- EXTRACTION DES SOLDES ---
        const piBalance = user.wallets.find(w => w.currency === "PI")?.balance ?? 0;
        const xafBalance = user.wallets.find(w => w.currency === "XAF")?.balance ?? 0;
        const sdaBalance = user.wallets.find(w => w.currency === "SIDRA")?.balance ?? 0;
        const usdtBalance = user.wallets.find(w => w.currency === "USDT")?.balance ?? 0;

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                // Priorité au nom complet, sinon username, sinon @PIONEER par défaut
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "PIONEER",
                piUserId: user.piUserId, // Champ requis pour identifier l'utilisateur Pi
                avatar: user.avatar,
                kycStatus: user.kycStatus,
                walletAddress: user.walletAddress,
                usdtAddress: user.usdtAddress,
                sidraAddress: user.sidraAddress,
                // On s'assure que les clés correspondent à ce que ton Dashboard frontend attend
                balances: {
                    pi: piBalance,
                    xaf: xafBalance,
                    sda: sdaBalance,
                    usdt: usdtBalance
                },
                wallets: user.wallets,
                virtualCards: user.virtualCards,
            }
        });

    } catch (error: any) {
        console.error("PROFILE_ERROR:", error.message);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
