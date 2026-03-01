import { createHmac, randomBytes } from "crypto";

/**
 * PIMPAY - Google Authenticator TOTP Utility
 * Implements RFC 6238 TOTP without external dependencies
 */

const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

/**
 * Generate a random Base32-encoded secret
 */
export function generateSecret(length = 20): string {
  const buffer = randomBytes(length);
  return base32Encode(buffer);
}

/**
 * Generate the OTP Auth URI for QR code scanning
 */
export function generateOtpAuthUri(
  secret: string,
  accountName: string,
  issuer = "PimPay"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

/**
 * Verify a TOTP code (checks current window and +/- 1 period for clock drift)
 */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const now = Math.floor(Date.now() / 1000);

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now + i * TOTP_PERIOD) / TOTP_PERIOD);
    const expectedCode = generateTotpCode(secret, counter);
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate a TOTP code for a given counter
 */
function generateTotpCode(secret: string, counter: number): string {
  const decodedSecret = base32Decode(secret);

  // Convert counter to 8-byte big-endian buffer
  const buffer = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) {
    buffer[i] = counter & 0xff;
    counter = counter >> 8;
  }

  // HMAC-SHA1
  const hmac = createHmac("sha1", decodedSecret);
  hmac.update(buffer);
  const hmacResult = hmac.digest();

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = code % Math.pow(10, TOTP_DIGITS);
  return otp.toString().padStart(TOTP_DIGITS, "0");
}

// Base32 encoding/decoding helpers
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let result = "";
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 0x1f];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f];
  }

  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}
