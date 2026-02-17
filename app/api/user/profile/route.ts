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

// All required wallet currencies
const REQUIRED_WALLETS = [
    { currency: "XAF", type: "FIAT" as const },
    { currency: "PI", type: "PI" as const },
    { currency: "SIDRA", type: "SIDRA" as const },
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

        // --- SYNC BLOCKCHAIN ADDRESSES ---
        const needsAddressSync = !user.sidraAddress || !user.walletAddress;
        if (needsAddressSync) {
            const ids = generateBlockchainIdentities();

            // Build safe update data (only fields that exist in schema)
            const updateData: Record<string, unknown> = {
                sidraAddress: user.sidraAddress || ids.sidra.address,
                sidraPrivateKey: user.sidraPrivateKey || ids.sidra.privateKey,
                walletAddress: user.walletAddress || ids.pi.address,
            };

            // Try to set usdtAddress safely
            try {
                user = await prisma.user.update({
                    where: { id: userId },
                    data: {
                        ...updateData,
                        usdtAddress: (user as Record<string, unknown>).usdtAddress as string || ids.usdt.address,
                        usdtPrivateKey: (user as Record<string, unknown>).usdtPrivateKey as string || ids.usdt.privateKey,
                    },
                    include: { wallets: true, virtualCards: true }
                });
            } catch {
                // Fallback without usdtAddress fields if they don't exist in DB yet
                user = await prisma.user.update({
                    where: { id: userId },
                    data: updateData,
                    include: { wallets: true, virtualCards: true }
                });
            }
        }

        // --- ENSURE ALL REQUIRED WALLETS EXIST ---
        const existingCurrencies = new Set(user.wallets.map(w => w.currency));
        const missingWallets = REQUIRED_WALLETS.filter(rw => !existingCurrencies.has(rw.currency));

        if (missingWallets.length > 0) {
            await Promise.all(
                missingWallets.map(mw =>
                    prisma.wallet.create({
                        data: {
                            userId,
                            currency: mw.currency,
                            balance: 0,
                            type: mw.type,
                        }
                    }).catch(() => null) // ignore if already exists due to race condition
                )
            );

            // Re-fetch user with all wallets
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: { wallets: true, virtualCards: true }
            }) as typeof user;

            if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
        }

        // --- EXTRACT BALANCES ---
        const walletBalances: Record<string, number> = {};
        for (const w of user.wallets) {
            const key = w.currency === "SIDRA" ? "sda" : w.currency.toLowerCase();
            walletBalances[key] = w.balance;
        }

        // Get usdtAddress safely
        let usdtAddress = "";
        try {
            usdtAddress = (user as Record<string, unknown>).usdtAddress as string || "";
        } catch {
            // Field may not exist
        }

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "PIONEER",
                piUserId: user.piUserId,
                avatar: user.avatar,
                kycStatus: user.kycStatus,
                walletAddress: user.walletAddress,
                usdtAddress: usdtAddress,
                sidraAddress: user.sidraAddress,
                balances: {
                    pi: walletBalances.pi ?? 0,
                    xaf: walletBalances.xaf ?? 0,
                    sda: walletBalances.sda ?? 0,
                    usdt: walletBalances.usdt ?? 0,
                    btc: walletBalances.btc ?? 0,
                    xrp: walletBalances.xrp ?? 0,
                    xlm: walletBalances.xlm ?? 0,
                    usdc: walletBalances.usdc ?? 0,
                    dai: walletBalances.dai ?? 0,
                    busd: walletBalances.busd ?? 0,
                },
                wallets: user.wallets.map(w => ({
                    ...w,
                    currency: w.currency === "SIDRA" ? "SDA" : w.currency,
                })),
                virtualCards: user.virtualCards,
            }
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("PROFILE_ERROR:", message);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
