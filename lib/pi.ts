/**
 * Verify Pi Browser signature placeholder.
 * The Pi Wallet SDK / Pi Browser signing scheme may vary.
 * Replace this with real verification logic (public key, crypto verify).
 */
export async function verifyPiSignature(payload: {
  signedMessage?: string;
  signature?: string;
  publicKey?: string;
}) {
  // TODO: implement real verification
  // For now, accept if signature exists (DEV ONLY).
  if (!payload.signature || !payload.signedMessage) return false;
  // In production: use crypto.subtle / node crypto to verify signature against publicKey
  return true;
}
