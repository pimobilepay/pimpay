import { countries } from "@/lib/country-data";

export interface ConversionResult {
  piAmount: number;
  localAmount: number;
  currency: string;
  rate: number;
}

class ConversionService {
  /**
   * Convertit une monnaie locale (XOF, CDF, etc.) en PI
   * Basé sur le prix de consensus et le taux de change du pays
   */
  async localToPi(amount: number, countryCode: string, consensusPriceUSD: number): Promise<ConversionResult> {
    const country = countries.find(c => c.code === countryCode);
    if (!country) throw new Error("Pays non supporté");

    // 1. Convertir le montant local en USD (via le taux PiToLocalRate de ton fichier data)
    // Ici, on considère que piToLocalRate est le prix de 1 Pi en monnaie locale
    // Donc : Prix de 1 USD en local = piToLocalRate / consensusPriceUSD
    const localToUsdRate = country.piToLocalRate / consensusPriceUSD;
    
    // 2. Calculer le montant en PI
    const piAmount = amount / country.piToLocalRate;

    return {
      piAmount: Number(piAmount.toFixed(6)),
      localAmount: amount,
      currency: country.currency,
      rate: country.piToLocalRate
    };
  }

  /**
   * Convertit des PI en monnaie locale
   */
  piToLocal(piAmount: number, countryCode: string): ConversionResult {
    const country = countries.find(c => c.code === countryCode);
    if (!country) throw new Error("Pays non supporté");

    const localAmount = piAmount * country.piToLocalRate;

    return {
      piAmount,
      localAmount: Number(localAmount.toFixed(2)),
      currency: country.currency,
      rate: country.piToLocalRate
    };
  }
}

export const conversionService = new ConversionService();
