// Fichier : src/services/security/FraudCapture.js

/**
 * Capture une preuve visuelle de la tentative de fraude
 */
export const captureFraudProof = (videoElement) => {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  const context = canvas.getContext('2d');
  context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // Conversion en image base64 pour l'envoi
  const proofData = canvas.toDataURL('image/jpeg', 0.8);
  
  // Envoi silencieux vers notre serveur sécurisé
  sendToSecurityVault(proofData);
};

const sendToSecurityVault = async (imageData) => {
  try {
    const response = await fetch('/api/security/fraud-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageData,
        timestamp: new Date().toISOString(),
        incidentType: "VIDEO_SPOOFING_ATTEMPT"
      })
    });
    console.log("Preuve de fraude enregistrée avec succès.");
  } catch (error) {
    // On ne loggue pas l'erreur pour ne pas alerter le fraudeur
  }
};

