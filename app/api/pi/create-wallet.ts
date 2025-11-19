// pages/api/pi/create-wallet.ts
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { randomUUID } from "crypto";
import { Pool } from "pg"; // exemple DB - adapte à ton ORM

// --- CONFIG: définir dans .env ---
const MASTER_KEY = process.env.WALLET_MASTER_KEY; // 32 bytes base64 (voir NOTES)
// DATABASE_URL in env for pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// --- Helper: generate ed25519 keypair ---
function generateEd25519Keypair() {
  // Node.js: generateKeyPairSync('ed25519')
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const pub = publicKey.export({ type: "spki", format: "der" }); // Buffer
  const priv = privateKey.export({ type: "pkcs8", format: "der" }); // Buffer
  return { publicKey: pub, privateKey: priv };
}

// --- Helper: AES-256-GCM encrypt ---
function encryptPrivateKey(masterKeyBase64: string, plaintext: Buffer) {
  const masterKey = Buffer.from(masterKeyBase64, "base64");
  if (masterKey.length !== 32) throw new Error("WALLET_MASTER_KEY must be 32 bytes (base64).");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

// --- (Optional) decrypt helper for server usage ---
function decryptPrivateKey(masterKeyBase64: string, ciphertextB64: string, ivB64: string, tagB64: string) {
  const masterKey = Buffer.from(masterKeyBase64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain; // Buffer (der pkcs8)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!MASTER_KEY) return res.status(500).json({ error: "Server misconfiguration: WALLET_MASTER_KEY missing" });

  try {
    // 1) gen keypair
    const { publicKey, privateKey } = generateEd25519Keypair();

    // Format public key for client: hex or base58 (here hex)
    const publicHex = publicKey.toString("hex");

    // 2) encrypt privateKey
    const { ciphertext, iv, tag } = encryptPrivateKey(MASTER_KEY, privateKey);

    // 3) store in DB: walletId, publicKey, ciphertext, iv, tag, createdAt, metadata
    const walletId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO wallets (id, public_key, private_encrypted, iv, tag, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [walletId, publicHex, ciphertext, iv, tag]
      );
    } finally {
      client.release();
    }

    // 4) respond with public info only
    return res.status(201).json({
      walletId,
      publicKey: publicHex,
      message: "Wallet created. Private key is stored encrypted on server.",
    });
  } catch (err: any) {
    console.error("create-wallet error:", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
}
