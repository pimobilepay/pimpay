// Ce fichier ne s'exécute QUE côté serveur (Server-side only)
import 'server-only';

export const getMasterKey = () => {
  const key = process.env.PI_PRIVATE_KEY;
  if (!key) throw new Error("ALERTE : Clé de sécurité manquante !");
  return key;
};
