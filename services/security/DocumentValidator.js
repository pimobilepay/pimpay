// Fichier : src/services/security/DocumentValidator.js

const crypto = require('crypto');

/**
 * Algorithme PimPay TrustGuard v1.0
 * Vérifie l'intégrité des documents KYC
 */
const validateDocumentIntegrity = (fileBuffer, metadata) => {
  const securityReport = {
    isFalsified: false,
    confidenceScore: 100,
    flags: []
  };

  // 1. Vérification des signatures logicielles dans les métadonnées
  const suspiciousSoftware = ['photoshop', 'gimp', 'canva', 'pixlr', 'adobe'];
  const softwareUsed = metadata.software?.toLowerCase() || "";

  suspiciousSoftware.forEach(app => {
    if (softwareUsed.includes(app)) {
      securityReport.isFalsified = true;
      securityReport.flags.push(`Logiciel de retouche détecté : ${app}`);
      securityReport.confidenceScore -= 40;
    }
  });

  // 2. Vérification de la cohérence du format (Magique Numbers)
  // Un PDF ou un JPEG doit commencer par des octets spécifiques
  const header = fileBuffer.toString('hex', 0, 4);
  const isJPG = header === 'ffd8ffe0' || header === 'ffd8ffe1';
  
  if (!isJPG && metadata.format === 'jpg') {
    securityReport.isFalsified = true;
    securityReport.flags.push("Discordance entre l'extension et la structure réelle du fichier");
    securityReport.confidenceScore -= 50;
  }

  // 3. Analyse de l'empreinte (Hash) pour la traçabilité
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  securityReport.documentHash = fileHash;

  return securityReport;
};

// Exemple d'utilisation dans notre Service Room
export const processKYC = (file, meta) => {
  const report = validateDocumentIntegrity(file, meta);
  
  if (report.isFalsified) {
    console.error("ALERTE SÉCURITÉ : Tentative de fraude détectée !");
    return { status: "REJECTED", reason: report.flags };
  }
  
  return { status: "SUCCESS", hash: report.documentHash };
};

