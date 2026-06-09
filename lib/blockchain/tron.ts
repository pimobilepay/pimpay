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
 * SOLUTION — 4 stratégies en cascade :
 *  1. TronScan account info API → fonctionne pour les tokens TRC20
 *  2. TronScan transfers API  → calcul à partir des transferts (IN - OUT)
 *  3. TronGrid /tokens/trc20  → fonctionne si le compte est activé
 *  4. TronGrid /accounts      → fallback final pour comptes activés
 */
export async function getUsdtBalance(tronAddress: string): Promise<number> {
  const headers = getTronGridHeaders();

  // Stratégie 1 : TronScan account info — FONCTIONNE POUR LES TOKENS TRC20
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(
      `https://apilist.tronscanapi.com/api/account?address=${tronAddress}`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      // Chercher dans les tokens TRC20 (withPriceTokens ou trc20token_balances)
      const trc20Tokens = data?.withPriceTokens || data?.trc20token_balances || [];
      
      for (const token of trc20Tokens) {
        const contractAddr = token?.tokenId || token?.contract_address || token?.tokenContractAddress || "";
        if (contractAddr === USDT_TRC20_CONTRACT) {
          // Le solde peut être dans différents champs selon la version de l'API
          const rawBalance = token?.balance || token?.amount || "0";
          const tokenDecimals = token?.tokenDecimal || token?.decimals || 6;
          const balance = Number(rawBalance) / Math.pow(10, tokenDecimals);
          console.log(`[TRON] TronScan account USDT balance for ${tronAddress.substring(0, 8)}...: ${balance} USDT`);
          return balance;
        }
      }
    }
  } catch (e: any) {
    console.warn("[TRON] TronScan account info failed:", e.message);
  }

  // Stratégie 2 : TronScan transfers — calcul à partir des transferts (IN - OUT)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 10000);

    // Récupérer TOUTES les transactions (entrantes ET sortantes)
    const url =
      `https://apilist.tronscanapi.com/api/token_trc20/transfers` +
      `?relatedAddress=${tronAddress}&contract_address=${USDT_TRC20_CONTRACT}&limit=200&start=0`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(tid);

    if (res.ok) {
      const data = await res.json();
      const transfers: Array<{
        to_address?: string;
        from_address?: string;
        transferToAddress?: string;
        transferFromAddress?: string;
        quant?: string;
        amount?: string;
      }> = data?.token_transfers ?? data?.data ?? [];

      if (transfers.length > 0) {
        let netRaw = 0n;
        for (const t of transfers) {
          const toAddr = t.to_address || t.transferToAddress || "";
          const fromAddr = t.from_address || t.transferFromAddress || "";
          const amount = BigInt(t.quant ?? t.amount ?? "0");
          
          if (toAddr === tronAddress) netRaw += amount;
          if (fromAddr === tronAddress) netRaw -= amount;
        }
        const balance = Number(netRaw < 0n ? 0n : netRaw) / 1_000_000;
        console.log(`[TRON] TronScan transfers USDT balance for ${tronAddress.substring(0, 8)}...: ${balance} USDT (from ${transfers.length} transfers)`);
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
 * Résultat de la vérification du reçu interne d'une transaction TRON.
 *
 * IMPORTANT : sur TRON, une transaction peut être incluse dans un bloc
 * (donc "confirmée" au niveau de la chaîne) tout en ayant ÉCHOUÉ au niveau
 * de l'exécution du smart contract (revert, manque d'énergie, etc.).
 * Il faut donc TOUJOURS vérifier le reçu interne (`receipt.result` /
 * `contractRet`) avant de créditer le solde d'un utilisateur.
 */
export interface TronReceiptResult {
  /** La transaction est-elle incluse dans un bloc (confirmée on-chain) ? */
  confirmed: boolean;
  /** La transaction a-t-elle RÉUSSI son exécution (reçu interne OK) ? */
  success: boolean;
  /** Code de résultat brut : "SUCCESS" | "REVERT" | "OUT_OF_ENERGY" | "OUT_OF_TIME" | ... */
  result: string;
  /** contractRet brut renvoyé par la chaîne (ex: "SUCCESS", "REVERT") */
  contractRet: string;
  /** Énergie consommée par la transaction */
  energyUsed: number;
  /** Frais réseau (en TRX) prélevés */
  netFee: number;
  /** Message d'erreur lisible si la transaction a échoué */
  errorMessage: string | null;
}

/**
 * Vérifie le reçu interne d'une transaction TRON via TronGrid.
 *
 * Utilise l'endpoint REST `/wallet/gettransactioninfobyid` (équivalent à
 * `tronWeb.trx.getTransactionInfo(txId)`) pour lire `receipt.result`.
 *
 * Stratégie :
 *  - On poll jusqu'à `maxAttempts` fois (la tx met quelques secondes à être
 *    minée + indexée). Tant que le reçu est vide → not confirmed.
 *  - Dès que `receipt.result` est disponible :
 *      - "SUCCESS"        → success = true
 *      - "REVERT"         → échec (slippage / logique contrat)
 *      - "OUT_OF_ENERGY"  → échec (énergie insuffisante)
 *      - "OUT_OF_TIME" / "OUT_OF_MEMORY" / etc. → échec
 *  - `contractRet` (dans le bloc `ret`) est aussi vérifié en complément.
 */
export async function verifyTronTransaction(
  txId: string,
  maxAttempts: number = 10,
  delayMs: number = 3000
): Promise<TronReceiptResult> {
  const headers = getTronGridHeaders();

  const fail = (result: string, message: string): TronReceiptResult => ({
    confirmed: true,
    success: false,
    result,
    contractRet: result,
    energyUsed: 0,
    netFee: 0,
    errorMessage: message,
  });

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(
        "https://api.trongrid.io/wallet/gettransactioninfobyid",
        {
          method: "POST",
          signal: controller.signal,
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ value: txId }),
        }
      );
      clearTimeout(tid);

      if (!res.ok) continue;

      const info = await res.json();

      // Reçu vide → transaction pas encore minée/indexée, on réessaie
      if (!info || Object.keys(info).length === 0 || !info.receipt) {
        continue;
      }

      // `receipt.result` n'existe que pour les appels de smart contract.
      // Pour un simple transfert TRX, il peut être absent mais contractRet=SUCCESS.
      const receiptResult: string = info.receipt?.result ?? "";
      const contractRet: string =
        Array.isArray(info.contractResult) && info.contractRet
          ? info.contractRet
          : info.receipt?.result ?? "SUCCESS";

      const energyUsed: number =
        Number(info.receipt?.energy_usage_total ?? info.receipt?.energy_usage ?? 0);
      const netFee: number = Number(info.fee ?? 0) / 1_000_000;

      // resMessage est encodé en hex par TronGrid
      let decodedError: string | null = null;
      if (info.resMessage) {
        try {
          decodedError = Buffer.from(info.resMessage, "hex").toString("utf8");
        } catch {
          decodedError = info.resMessage;
        }
      }

      // Cas d'échec explicites
      const failureCodes = [
        "REVERT",
        "OUT_OF_ENERGY",
        "OUT_OF_TIME",
        "OUT_OF_MEMORY",
        "BAD_JUMP_DESTINATION",
        "STACK_TOO_SMALL",
        "STACK_TOO_LARGE",
        "ILLEGAL_OPERATION",
        "TRANSFER_FAILED",
        "JVM_STACK_OVER_FLOW",
        "FAILED",
      ];

      if (receiptResult && failureCodes.includes(receiptResult)) {
        return {
          confirmed: true,
          success: false,
          result: receiptResult,
          contractRet,
          energyUsed,
          netFee,
          errorMessage:
            decodedError ||
            (receiptResult === "OUT_OF_ENERGY"
              ? "Énergie insuffisante pour exécuter la transaction"
              : receiptResult === "REVERT"
                ? "Transaction annulée par le contrat (slippage ou liquidité insuffisante)"
                : `Échec d'exécution : ${receiptResult}`),
        };
      }

      // contractRet en échec (ex: REVERT au niveau de l'inclusion)
      if (contractRet && failureCodes.includes(contractRet)) {
        return {
          confirmed: true,
          success: false,
          result: contractRet,
          contractRet,
          energyUsed,
          netFee,
          errorMessage: decodedError || `Transaction rejetée : ${contractRet}`,
        };
      }

      // Succès : receipt.result === "SUCCESS" (smart contract) OU
      // simple transfert avec contractRet "SUCCESS" et pas d'erreur.
      const isSuccess =
        receiptResult === "SUCCESS" ||
        (!receiptResult && (contractRet === "SUCCESS" || !contractRet));

      if (isSuccess) {
        return {
          confirmed: true,
          success: true,
          result: receiptResult || "SUCCESS",
          contractRet: contractRet || "SUCCESS",
          energyUsed,
          netFee,
          errorMessage: null,
        };
      }

      // Reçu présent mais statut inattendu → on considère comme échec prudent
      return fail(
        receiptResult || contractRet || "UNKNOWN",
        decodedError || "Statut de transaction inconnu"
      );
    } catch (err: any) {
      console.warn(`[TRON] verifyTronTransaction attempt ${attempt + 1} failed:`, err.message);
    }
  }

  // Après tous les essais : la tx n'a jamais été confirmée/indexée.
  return {
    confirmed: false,
    success: false,
    result: "NOT_CONFIRMED",
    contractRet: "",
    energyUsed: 0,
    netFee: 0,
    errorMessage:
      "Transaction non confirmée sur la blockchain après plusieurs tentatives. Vérifiez manuellement sur Tronscan.",
  };
}

/**
 * Classe une erreur de broadcast/exécution TRON en message utilisateur clair.
 * Couvre les cas Energy / Bandwidth / Fee Limit les plus fréquents.
 */
export function classifyTronError(rawError: string): string {
  const e = (rawError || "").toLowerCase();

  if (e.includes("out_of_energy") || (e.includes("energy") && e.includes("insufficient"))) {
    return "Énergie TRON insuffisante. Rechargez votre compte en TRX (ou gelez du TRX pour obtenir de l'énergie) puis réessayez.";
  }
  if (e.includes("bandwidth") && (e.includes("insufficient") || e.includes("not enough"))) {
    return "Bande passante (Bandwidth) TRON insuffisante. Conservez un peu de TRX sur votre adresse pour couvrir les frais réseau.";
  }
  if (e.includes("feelimit") || e.includes("fee_limit") || e.includes("fee limit")) {
    return "Limite de frais (Fee Limit) dépassée pour cette transaction. Le swap nécessite plus de ressources que prévu.";
  }
  if (e.includes("balance is not sufficient") || e.includes("insufficient balance")) {
    return "Solde TRX insuffisant pour couvrir le montant et les frais réseau.";
  }
  if (e.includes("revert")) {
    return "Transaction annulée par le contrat (slippage trop faible ou liquidité insuffisante). Augmentez votre tolérance de slippage et réessayez.";
  }
  if (e.includes("timeout") || e.includes("aborted")) {
    return "Le réseau TRON met trop de temps à répondre. Réessayez dans quelques instants.";
  }
  return rawError || "Erreur inconnue lors de l'exécution sur la blockchain TRON.";
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
