import bs58 from 'bs58';
import crypto from 'crypto';

/**
 * Utilitaires pour la structure TRON de PimPay
 */

/**
 * Valide si une adresse TRON est syntaxiquement correcte (Base58Check)
 */
export function isValidTronAddress(address: string): boolean {
  try {
    if (!address || typeof address !== 'string') return false;

    // Une adresse TRON commence toujours par 'T'
    if (!address.startsWith('T')) return false;

    // Décodage Base58
    const decoded = bs58.decode(address);
    if (decoded.length !== 25) return false;

    // Vérification du checksum (les 4 derniers octets)
    const body = decoded.slice(0, 21);
    const checksum = decoded.slice(21);

    const hash1 = crypto.createHash('sha256').update(body).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();

    // FIX: Conversion explicite en Buffer pour utiliser .toString('hex')
    const checksumHex = Buffer.from(checksum).toString('hex');
    const hash2PrefixHex = Buffer.from(hash2.slice(0, 4)).toString('hex');

    return checksumHex === hash2PrefixHex;
  } catch (e) {
    return false;
  }
}

/**
 * Convertit une adresse Hex (ex: 418840...) en adresse Base58 (ex: TNPee...)
 */
export function hexToBase58(hexAddress: string): string {
  try {
    const hex = hexAddress.startsWith('41') ? hexAddress : '41' + hexAddress;
    const buffer = Buffer.from(hex, 'hex');

    // Double SHA256 pour le checksum
    const hash1 = crypto.createHash('sha256').update(buffer).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    const checksum = hash2.slice(0, 4);

    const finalBuffer = Buffer.concat([buffer, checksum]);
    return bs58.encode(finalBuffer);
  } catch (e) {
    return "";
  }
}

/**
 * Convertit une adresse Base58 (T...) en Hex (41...)
 */
export function base58ToHex(address: string): string {
  try {
    const decoded = bs58.decode(address);
    // On enlève le checksum (4 derniers octets)
    // FIX: Conversion en Buffer pour .toString('hex')
    return Buffer.from(decoded.slice(0, 21)).toString('hex').toUpperCase();
  } catch (e) {
    return "";
  }
}
