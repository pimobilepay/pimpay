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

const REQUIRED_WALLETS = [
    { currency: "XAF", type: "FIAT" as const },
    { currency: "PI", type: "PI" as const },
    { currency: "SDA", type: "SIDRA" as const },
    { currency: "USDT", type: "CRYPTO" as const },
    { currency: "BTC", type: "CRYPTO" as const },
    { currency: "XRP", type: "CRYPTO" as const },
    { currency: "XLM", type: "CRYPTO" as const },
    { currency: "USDC", type: "CRYPTO" as const },
    { currency: "DAI", type: "CRYPTO" as const },
    { currency: "BUSD", type: "CRYPTO" as const },
];

export async function GET() {
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
            } catch {
                return NextResponse.json({ error: "Session expirée" }, { status: 401 });
            }
        }

        if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { wallets: true, virtualCards: true }
        });

        if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

        // 1. Synchronisation des adresses ET des clés privées (walletPrivateKey inclus)
        if (!user.sidraAddress || !user.usdtAddress || !user.walletPrivateKey) {
            const ids = generateBlockchainIdentities();
            user = await prisma.user.update({
                where: { id: userId },
                data: {
                    sidraAddress: user.sidraAddress || ids.sidra.address,
                    sidraPrivateKey: user.sidraPrivateKey || ids.sidra.privateKey,
                    walletPrivateKey: user.walletPrivateKey || ids.sidra.privateKey, // RÉPARE L'ERREUR D'ENVOI
                    usdtAddress: user.usdtAddress || ids.usdt.address,
                    usdtPrivateKey: user.usdtPrivateKey || ids.usdt.privateKey,
                    walletAddress: user.walletAddress || ids.pi.address,
                },
                include: { wallets: true, virtualCards: true }
            });
        }

        // 2. Gestion intelligente des monnaies (Évite les doublons SDA/SIDRA)
        const existingCurrencies = new Set(user.wallets.map(w => w.currency));
        
        // On considère que SDA et SIDRA c'est la même chose pour éviter le doublon
        const hasSidraAnyForm = existingCurrencies.has("SIDRA") || existingCurrencies.has("SDA");

        const missingWallets = REQUIRED_WALLETS.filter(rw => {
            if (rw.currency === "SDA" && hasSidraAnyForm) return false;
            return !existingCurrencies.has(rw.currency);
        });

        if (missingWallets.length > 0) {
            await Promise.all(
                missingWallets.map(mw =>
                    prisma.wallet.create({
                        data: {
                            userId: userId as string,
                            currency: mw.currency,
                            balance: 0,
                            type: mw.type,
                        }
                    }).catch(() => null)
                )
            );
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: { wallets: true, virtualCards: true }
            }) as any;
        }

        // 3. Extraction des soldes
        const balances: Record<string, number> = {};
        user?.wallets.forEach(w => {
            const key = (w.currency === "SIDRA" || w.currency === "SDA") ? "sda" : w.currency.toLowerCase();
            balances[key] = w.balance;
        });

        return NextResponse.json({
            success: true,
            user: {
                ...user,
                name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || "PIONEER",
                balances,
                wallets: user?.wallets.map(w => ({
                    ...w,
                    currency: (w.currency === "SIDRA" || w.currency === "SDA") ? "SDA" : w.currency,
                })),
            }
        });

    } catch (error: any) {
        console.error("PROFILE_ERROR:", error.message);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
