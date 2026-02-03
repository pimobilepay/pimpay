// hooks/useTransfer.ts
import { useState } from 'react';

export type CurrencyType = 'SDA' | 'BTC' | 'PI' | 'XAF' | 'USD' | 'EUR';

export const useTransfer = () => {
  const [currency, setCurrency] = useState<CurrencyType>('SDA');

  const validateDestination = (destination: string, type: CurrencyType, currentUserAddress?: string) => {
    // 1. Interdire l'envoi à soi-même (évite les boucles infinies de solde)
    if (destination === currentUserAddress) return 'SELF_TRANSFER_INVALID';

    // 2. Transfert interne PimPay
    if (destination.startsWith('@')) return 'INTERNAL_USER'; 

    switch (type) {
      case 'SDA': 
        return destination.startsWith('0x') && destination.length === 42 ? 'EXTERNAL_SDA' : 'INVALID';
      case 'BTC': 
        return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(destination) ? 'EXTERNAL_BTC' : 'INVALID';
      case 'PI': 
        return destination.length > 20 ? 'EXTERNAL_PI' : 'INVALID';
      default: 
        return 'FIAT_BANK';
    }
  };

  return { currency, setCurrency, validateDestination };
};
