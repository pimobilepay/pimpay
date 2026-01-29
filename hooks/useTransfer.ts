// hooks/useTransfer.ts
import { useState } from 'react';

export type CurrencyType = 'SDA' | 'BTC' | 'PI' | 'XAF' | 'USD' | 'EUR';

export const useTransfer = () => {
  const [currency, setCurrency] = useState<CurrencyType>('SDA');

  // Validation des formats d'adresse selon la monnaie
  const validateDestination = (destination: string, type: CurrencyType) => {
    if (destination.startsWith('@')) return 'INTERNAL_USER'; // Transfert interne PimPay
    
    switch (type) {
      case 'SDA': return destination.startsWith('0x') && destination.length === 42 ? 'EXTERNAL_SDA' : 'INVALID';
      case 'BTC': return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(destination) ? 'EXTERNAL_BTC' : 'INVALID';
      case 'PI': return destination.length > 20 ? 'EXTERNAL_PI' : 'INVALID'; // Selon format Pi Network
      default: return 'FIAT_BANK'; // Pour XAF, USD, etc. (vers compte bancaire ou interne)
    }
  };

  return { currency, setCurrency, validateDestination };
};
