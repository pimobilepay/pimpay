/**
 * PIMPAY - Librairie centralisée pour les interactions TRON (TRX + TRC20)
 * Utilise TRONGRID_API_KEY pour les appels API TronGrid
 */

// Adresse du contrat USDT (TRC20) sur le mainnet TRON
export const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

/**
 * Retourne les headers pour les appels TronGrid avec l'API key si disponible
 */
export function getTronGridHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.TRONGRID_API_KEY) {
    headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  }
  return headers;
}

/**
 * Récupère le solde TRX natif d'une adresse TRON
 * Retourne 0 pour les adresses inactivées (jamais reçu de TRX)
 */
export async function getTrxBalance(tronAddress: string): Promise<number> {
  const headers = getTronGridHeaders();

  // Stratégie 1 : TronGrid /v1/accounts (le plus fiable pour TRX natif)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}`,
      { signal: controller.signal, headers }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.balance !== undefined) {
        // Le solde TRX est en SUN (1 TRX = 1,000,000 SUN)
        return Number(data.data[0].balance) / 1_000_000;
      }
      // data vide = adresse inactivée → solde 0
      if (data?.data?.length === 0) {
        return 0;
      }
    }
  } catch (err: any) {
    console.warn("[TRON] TronGrid /accounts failed:", err.message);
  }

  // Stratégie 2 : TronScan API (fallback)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://apilist.tronscanapi.com/api/account?address=${tronAddress}`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (data?.balance !== undefined) {
        return Number(data.balance) / 1_000_000;
      }
    }
  } catch (err: any) {
    console.warn("[TRON] TronScan account failed:", err.message);
  }

  return 0;
}

/**
 * Récupère le solde USDT TRC20 d'une adresse TRON
 * 
 * PROBLÈME ADRESSE INACTIVÉE :
 * Sur TRON, une adresse est "inactivée" tant qu'elle n'a jamais reçu de TRX.
 * TronGrid /v1/accounts/{addr} retourne data:[] pour ces adresses → solde 0
 * même si des USDT y ont été reçus via transfert TRC20.
 *
 * SOLUTION — 3 stratégies en cascade :
 *  1. TronScan transfers API  → fonctionne MÊME sur adresses inactivées (lit les tx du contrat)
 *  2. TronGrid /tokens/trc20  → fonctionne si le compte est activé
 *  3. TronGrid /accounts      → fallback final pour comptes activés
 */
export async function getUsdtBalance(tronAddress: string): Promise<number> {
  const headers = getTronGridHeaders();

  // Stratégie 1 : TronScan transfers — FONCTIONNE SUR ADRESSES INACTIVÉES
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const url =
      `https://apilist.tronscanapi.com/api/token_trc20/transfers` +
      `?toAddress=${tronAddress}&contract_address=${USDT_TRC20_CONTRACT}&limit=200&start=0`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      const transfers: Array<{
        transferToAddress: string;
        transferFromAddress: string;
        quant: string;
      }> = data?.token_transfers ?? data?.data ?? [];

      if (transfers.length > 0) {
        let netRaw = 0n;
        for (const t of transfers) {
          const amount = BigInt(t.quant ?? "0");
          if (t.transferToAddress === tronAddress) netRaw += amount;
          if (t.transferFromAddress === tronAddress) netRaw -= amount;
        }
        const balance = Number(netRaw < 0n ? 0n : netRaw) / 1_000_000;
        console.log(`[TRON] TronScan USDT balance for ${tronAddress.substring(0, 8)}...: ${balance} USDT`);
        return balance;
      }
    }
  } catch (e: any) {
    console.warn("[TRON] TronScan transfers failed:", e.message);
  }

  // Stratégie 2 : TronGrid /tokens/trc20 (comptes activés)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}/tokens/trc20`,
      { signal: controller.signal, headers }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        for (const token of data.data) {
          const contractAddr: string = token?.tokenId ?? token?.token_id ?? "";
          if (contractAddr.toLowerCase() === USDT_TRC20_CONTRACT.toLowerCase()) {
            return Number(token.balance ?? token.amount ?? "0") / 1_000_000;
          }
        }
        return 0;
      }
    }
  } catch {
    // Continuer avec le fallback
  }

  // Stratégie 3 : TronGrid /v1/accounts (fallback comptes activés)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}`,
      { signal: controller.signal, headers }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.trc20) {
        const trc20List: Record<string, string>[] = data.data[0].trc20;
        const entry = trc20List.find((t) =>
          Object.keys(t).some(
            (k) => k.toLowerCase() === USDT_TRC20_CONTRACT.toLowerCase()
          )
        );
        if (entry) {
          return Number(Object.values(entry)[0] ?? "0") / 1_000_000;
        }
      }
      if (data?.data?.length > 0) return 0;
    }
  } catch (err: any) {
    console.error("[TRON] All USDT strategies failed:", err.message);
  }

  return 0;
}

/**
 * Récupère les dernières transactions TRX entrantes pour une adresse
 */
export async function getTrxIncomingTransactions(
  tronAddress: string,
  limit: number = 50
): Promise<Array<{
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  confirmed: boolean;
}>> {
  const headers = getTronGridHeaders();
  const transactions: Array<{
    hash: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    confirmed: boolean;
  }> = [];

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${tronAddress}/transactions?only_to=true&limit=${limit}`,
      { signal: controller.signal, headers }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        for (const tx of data.data) {
          if (tx.raw_data?.contract?.[0]?.type === "TransferContract") {
            const params = tx.raw_data.contract[0].parameter?.value;
            if (params) {
              transactions.push({
                hash: tx.txID,
                from: params.owner_address || "",
                to: params.to_address || "",
                amount: Number(params.amount || 0) / 1_000_000,
                timestamp: tx.block_timestamp || Date.now(),
                confirmed: tx.ret?.[0]?.contractRet === "SUCCESS",
              });
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.error("[TRON] Failed to fetch TRX transactions:", err.message);
  }

  return transactions;
}

/**
 * Récupère les dernières transactions USDT TRC20 entrantes pour une adresse
 */
export async function getUsdtIncomingTransactions(
  tronAddress: string,
  limit: number = 50
): Promise<Array<{
  hash: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  confirmed: boolean;
}>> {
  const transactions: Array<{
    hash: string;
    from: string;
    to: string;
    amount: number;
    timestamp: number;
    confirmed: boolean;
  }> = [];

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://apilist.tronscanapi.com/api/token_trc20/transfers` +
      `?toAddress=${tronAddress}&contract_address=${USDT_TRC20_CONTRACT}&limit=${limit}&start=0`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      const transfers = data?.token_transfers ?? data?.data ?? [];

      for (const t of transfers) {
        if (t.transferToAddress === tronAddress) {
          transactions.push({
            hash: t.transaction_id || t.hash || "",
            from: t.transferFromAddress || "",
            to: t.transferToAddress || "",
            amount: Number(t.quant || 0) / 1_000_000,
            timestamp: t.block_ts || Date.now(),
            confirmed: true,
          });
        }
      }
    }
  } catch (err: any) {
    console.error("[TRON] Failed to fetch USDT transactions:", err.message);
  }

  return transactions;
}
