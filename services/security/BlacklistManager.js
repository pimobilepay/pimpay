// Fichier : src/services/security/BlacklistManager.js

const blacklistedIPs = new Set(); // Stockage en mémoire vive (à lier à une DB pour le long terme)

/**
 * Gère le bannissement des fraudeurs
 */
export const BlacklistManager = {
  
  // Ajouter un fraudeur à la liste noire
  banUser: (ipAddress, reason, documentHash) => {
    const banDate = new Date().toISOString();
    const banRecord = {
      ip: ipAddress,
      reason: reason,
      hash: documentHash,
      date: banDate
    };

    blacklistedIPs.add(ipAddress);
    
    // Log de sécurité critique pour notre banque
    console.error(`[ALERTE PIMPAY] BANNI : IP ${ipAddress} pour motif : ${reason}`);
    
    // Ici, nous pourrions envoyer une notification push à notre tableau de bord admin
    return banRecord;
  },

  // Vérifier si un utilisateur est banni avant de charger la page
  isBanned: (ipAddress) => {
    return blacklistedIPs.has(ipAddress);
  }
};

/**
 * Intégration avec notre processus KYC
 */
export const secureKYCCheck = (file, metadata, userIP) => {
  // On appelle l'algorithme d'intégrité que nous avons créé juste avant
  const report = validateDocumentIntegrity(file, metadata);

  if (report.isFalsified && report.confidenceScore < 50) {
    // Si la falsification est flagrante, on bannit direct !
    BlacklistManager.banUser(userIP, report.flags.join(", "), report.documentHash);
    return { 
      status: "BANNED", 
      message: "Accès refusé définitivement pour tentative de fraude." 
    };
  }

  return { status: "PROCEED", report };
};

