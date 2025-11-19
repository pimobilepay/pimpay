// app/api/pi/create-wallet/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

const MASTER_KEY = process.env.WALLET_MASTER_KEY;

function generateEd25519Keypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "der" }),
    privateKey: privateKey.export({ type: "pkcs8", format: "der" })
  };
}

function encryptPrivateKey(masterKeyB64: string, privateKey: Buffer) {
  const masterKey = Buffer.from(masterKeyB64, "base64");
  if (masterKey.length !== 32) throw new Error("Invalid WALLET_MASTER_KEY");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  const encrypted = Buffer.concat([cipher.update(privateKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

export async function POST(req: Request) {
  if (!MASTER_KEY)
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  try {
    // 1) Generate keypair
    const { publicKey, privateKey } = generateEd25519Keypair();
    const publicHex = publicKey.toString("hex");

    // 2) Encrypt private key
    const encrypted = encryptPrivateKey(MASTER_KEY, privateKey);

    // 3) Save wallet
    const wallet = await prisma.wallet.create({
      data: {
        publicKey: publicHex,
        encryptedPrivate: encrypted.ciphertext,
        iv: encrypted.iv,
        tag: encrypted.tag
      }
    });

    // 4) Return public info
    return NextResponse.json(
      {
        walletId: wallet.id,
        publicKey: wallet.publicKey,
        success: true
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Wallet creation failed:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
