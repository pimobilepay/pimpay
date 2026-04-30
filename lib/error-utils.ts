import { getErrorMessage } from '@/lib/error-utils';
/**
 * Utilitaires de gestion d'erreur typés - PimPay
 * Évite les `catch (error: unknown)` qui contournent la vérification TypeScript.
 */

/**
 * Extrait le message d'une erreur inconnue de façon sûre.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return getErrorMessage(error);
  if (typeof error === "string") return error;
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Une erreur inattendue s'est produite";
}

/**
 * Extrait l'erreur comme instance Error (crée une nouvelle si nécessaire).
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}
