/**
 * PIMPAY - Système de Géo-restriction (Compliance Basel III)
 * Ce module vérifie si l'utilisateur se trouve dans une juridiction autorisée.
 * Répond à la violation : "Potential violations of local banking laws".
 */

// Liste des codes pays autorisés (ISO 3166-1 alpha-2)
// À mettre à jour selon tes partenariats bancaires (Phase 1 : Market Research)
const ALLOWED_COUNTRIES = ['QA', 'SA', 'AE', 'MY']; 

/**
 * Vérifie si une adresse IP est autorisée à accéder aux services bancaires
 * @param userCountryCode Code pays détecté via l'IP
 * @returns boolean
 */
export const isJurisdictionAllowed = (userCountryCode: string): boolean => {
  return ALLOWED_COUNTRIES.includes(userCountryCode.toUpperCase());
};

/**
 * Middleware de sécurité pour bloquer les transactions hors zone
 * Garantit que PimPay n'opère pas sans licence dans une région interdite.
 */
export const enforceComplianceGuard = (country: string) => {
  if (!isJurisdictionAllowed(country)) {
    throw new Error(
      "Accès restreint : PimPay n'est pas encore disponible dans votre juridiction conformément aux régulations locales."
    );
  }
  return true;
};

