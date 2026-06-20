// ---------------------------------------------------------------------------
// MOTEUR DE SECURITE DES UPLOADS (anti-attaque / anti-virus)
// ---------------------------------------------------------------------------
// Ce module centralise toute la logique de protection des fichiers envoyes par
// les utilisateurs (page de chat Elara, et reutilisable ailleurs).
//
// Strategie de defense en profondeur (plusieurs couches independantes) :
//   1. Liste blanche stricte des types MIME (jamais de SVG : porteur de XSS).
//   2. Verification de la signature binaire reelle (magic bytes) -> empeche un
//      .php/.exe renomme .jpg de passer.
//   3. Coherence entre type declare et contenu reel.
//   4. Analyse anti-virus / anti-payload : on scanne le contenu binaire a la
//      recherche de signatures d'executables, de scripts embarques (polyglot)
//      et de la chaine de test antivirus EICAR.
//   5. Limites de taille (min + max) pour bloquer les bombes / fichiers vides.
//
// Aucune dependance externe : tout est fait en mémoire sur le Buffer.
// ---------------------------------------------------------------------------

export const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MIN_BYTES = 100; // une image valide fait toujours > 100 octets

export type ImageFormat = "jpeg" | "png" | "gif" | "webp";

// Liste blanche stricte. On exclut volontairement image/svg+xml (XSS) et tout
// autre type non rasterise.
export const ALLOWED_MIME: Record<string, ImageFormat> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Verifie les premiers octets pour confirmer le vrai format de l'image.
export function detectImageSignature(buf: Buffer): ImageFormat | null {
  if (buf.length < 12) return null;

  // JPEG : FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return "png";

  // GIF : "GIF87a" / "GIF89a"
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";

  // WEBP : "RIFF" .... "WEBP"
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";

  return null;
}

// Signatures binaires d'EXECUTABLES / archives a bloquer absolument, meme si
// elles apparaissent APRES un en-tete d'image valide (attaque "polyglot").
const EXECUTABLE_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "windows-pe", bytes: [0x4d, 0x5a] }, // "MZ" (.exe, .dll)
  { name: "linux-elf", bytes: [0x7f, 0x45, 0x4c, 0x46] }, // 0x7F ELF
  { name: "macho-32", bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: "macho-64", bytes: [0xfe, 0xed, 0xfa, 0xcf] },
  { name: "java-class", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "shell-script", bytes: [0x23, 0x21, 0x2f] }, // "#!/"
];

// Motifs textuels de payloads injectes (XSS / RCE) que l'on ne veut jamais
// voir dans une image. Recherche insensible a la casse.
const MALICIOUS_TEXT_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "html-script", pattern: /<script[\s>]/i },
  { name: "php-open", pattern: /<\?php/i },
  { name: "php-short", pattern: /<\?=/i },
  { name: "asp-jsp", pattern: /<%[^>]*%>/ },
  { name: "js-event-handler", pattern: /\son\w+\s*=\s*["']?\s*javascript:/i },
  { name: "js-eval", pattern: /\beval\s*\(/i },
  { name: "base64-eval", pattern: /\b(?:atob|fromCharCode)\s*\(/i },
  { name: "svg-embedded", pattern: /<svg[\s>]/i },
  { name: "iframe", pattern: /<iframe[\s>]/i },
  { name: "doctype-html", pattern: /<!DOCTYPE\s+html/i },
];

// Signature standard de test antivirus EICAR (inoffensive mais permet de
// valider que la detection fonctionne ; tout AV serieux la bloque).
const EICAR_SIGNATURE =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

export type ThreatScanResult =
  | { safe: true }
  | { safe: false; reason: string; threat: string };

// Analyse approfondie du contenu binaire a la recherche de menaces.
export function scanBufferForThreats(buf: Buffer): ThreatScanResult {
  // 1. Executables / archives embarques (verifie aussi APRES l'en-tete image
  //    pour attraper les polyglots qui cachent un binaire dans le fichier).
  //    On limite la fenetre de recherche pour rester performant.
  const scanWindow = buf.subarray(0, Math.min(buf.length, 5 * 1024 * 1024));
  for (const sig of EXECUTABLE_SIGNATURES) {
    if (containsBytes(scanWindow, sig.bytes, 0)) {
      return {
        safe: false,
        threat: sig.name,
        reason: "Contenu executable detecte dans le fichier. Envoi bloque.",
      };
    }
  }

  // 2. Payloads textuels (XSS / scripts). On decode en latin1 pour conserver
  //    chaque octet comme un caractere, ce qui evite de manquer du texte cache.
  const asText = scanWindow.toString("latin1");
  for (const { name, pattern } of MALICIOUS_TEXT_PATTERNS) {
    if (pattern.test(asText)) {
      return {
        safe: false,
        threat: name,
        reason: "Code potentiellement malveillant detecte dans l'image. Envoi bloque.",
      };
    }
  }

  // 3. Signature de test antivirus EICAR.
  if (asText.includes(EICAR_SIGNATURE)) {
    return {
      safe: false,
      threat: "eicar-test",
      reason: "Fichier de test antivirus detecte. Envoi bloque.",
    };
  }

  return { safe: true };
}

// Cherche une sequence d'octets dans un buffer a partir d'un offset donne.
function containsBytes(haystack: Buffer, needle: number[], fromIndex = 0): boolean {
  if (needle.length === 0) return false;
  const limit = haystack.length - needle.length;
  for (let i = fromIndex; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

export type FileValidationResult =
  | { ok: true; format: ImageFormat }
  | { ok: false; status: number; error: string };

// Validation complete et orchestree d'un fichier image uploade.
// Combine : taille -> MIME -> signature -> coherence -> scan anti-menace.
export function validateImageUpload(
  declaredMime: string,
  size: number,
  buffer: Buffer,
): FileValidationResult {
  // Taille.
  if (size < MIN_BYTES) {
    return { ok: false, status: 400, error: "Fichier invalide ou vide." };
  }
  if (size > MAX_BYTES) {
    return { ok: false, status: 400, error: "Image trop volumineuse (max 10 Mo)." };
  }

  // Liste blanche du type declare.
  const allowedFormat = ALLOWED_MIME[declaredMime];
  if (!allowedFormat) {
    return {
      ok: false,
      status: 400,
      error: "Format non autorise. Images JPG, PNG, WEBP ou GIF uniquement.",
    };
  }

  // Signature binaire reelle.
  const signature = detectImageSignature(buffer);
  if (!signature) {
    return {
      ok: false,
      status: 400,
      error: "Le contenu du fichier n'est pas une image valide.",
    };
  }

  // Coherence type declare <-> contenu reel.
  if (signature !== allowedFormat) {
    return {
      ok: false,
      status: 400,
      error: "Type de fichier incoherent. Envoi refuse.",
    };
  }

  // Scan anti-virus / anti-payload.
  const scan = scanBufferForThreats(buffer);
  if (!scan.safe) {
    return { ok: false, status: 422, error: scan.reason };
  }

  return { ok: true, format: signature };
}
