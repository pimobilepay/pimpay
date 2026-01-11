// Au lieu de : const resend = new Resend(process.env.RESEND_API_KEY);

import { Resend } from 'resend';

// Utilise une fonction pour récupérer l'instance uniquement quand tu en as besoin
export const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // On ne jette pas d'erreur ici pour ne pas tuer le build
    // On l'affichera seulement lors de l'exécution réelle
    return null; 
  }
  return new Resend(apiKey);
};
