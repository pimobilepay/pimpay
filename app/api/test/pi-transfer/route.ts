export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * Endpoint de test pour diagnostiquer les problemes de transfert Pi
 * 
 * GET /api/test/pi-transfer - Verifie la configuration et la connectivite
 * POST /api/test/pi-transfer - Teste un transfert vers une adresse (testnet seulement)
 */

// Configuration
const PI_HORIZON_URL = process.env.PI_HORIZON_URL || "https://api.testnet.minepi.com";
const PI_NETWORK_PASSPHRASE = process.env.PI_NETWORK_PASSPHRASE || "Pi Testnet";
const PI_MASTER_ADDRESS = process.env.PI_MASTER_WALLET_ADDRESS;
const PI_MASTER_SECRET = process.env.PI_MASTER_WALLET_SECRET;
const PI_API_KEY = process.env.PI_API_KEY;

export async function GET(req: NextRequest) {
  console.log(`[v0] [PI_TEST] Verification de la configuration Pi Network...`);
  
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    config: {
      PI_HORIZON_URL: PI_HORIZON_URL,
      PI_NETWORK_PASSPHRASE: PI_NETWORK_PASSPHRASE,
      PI_MASTER_ADDRESS: PI_MASTER_ADDRESS ? PI_MASTER_ADDRESS.substring(0, 10) + "..." : "NON CONFIGURE",
      PI_MASTER_SECRET: PI_MASTER_SECRET ? "PRESENT (S...)" : "NON CONFIGURE",
      PI_API_KEY: PI_API_KEY ? "PRESENT" : "NON CONFIGURE",
      isTestnet: PI_NETWORK_PASSPHRASE?.includes("Testnet") || PI_HORIZON_URL?.includes("testnet")
    },
    tests: {}
  };
  
  // Test 1: Verification des variables d'environnement
  const missingVars = [];
  if (!PI_MASTER_ADDRESS) missingVars.push("PI_MASTER_WALLET_ADDRESS");
  if (!PI_MASTER_SECRET) missingVars.push("PI_MASTER_WALLET_SECRET");
  if (!PI_HORIZON_URL) missingVars.push("PI_HORIZON_URL");
  if (!PI_NETWORK_PASSPHRASE) missingVars.push("PI_NETWORK_PASSPHRASE");
  
  diagnostics.tests.envVars = {
    passed: missingVars.length === 0,
    missing: missingVars,
    message: missingVars.length === 0 
      ? "Toutes les variables sont configurees" 
      : `Variables manquantes: ${missingVars.join(", ")}`
  };
  
  if (missingVars.length > 0) {
    return NextResponse.json(diagnostics, { status: 400 });
  }
  
  // Test 2: Connexion a Horizon
  try {
    console.log(`[v0] [PI_TEST] Connexion a Horizon: ${PI_HORIZON_URL}`);
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
    
    // Verifier que le serveur repond
    const rootResponse = await fetch(`${PI_HORIZON_URL}/`);
    const rootData = await rootResponse.json();
    
    diagnostics.tests.horizonConnection = {
      passed: true,
      networkPassphrase: rootData.network_passphrase,
      horizonVersion: rootData.horizon_version,
      message: "Connexion Horizon OK"
    };
    
    // Verifier que la passphrase correspond
    if (rootData.network_passphrase !== PI_NETWORK_PASSPHRASE) {
      diagnostics.tests.horizonConnection.warning = 
        `Passphrase mismatch! Horizon: "${rootData.network_passphrase}", Config: "${PI_NETWORK_PASSPHRASE}"`;
    }
    
  } catch (error: any) {
    console.error(`[v0] [PI_TEST] Erreur connexion Horizon:`, error.message);
    diagnostics.tests.horizonConnection = {
      passed: false,
      error: error.message,
      message: "Impossible de se connecter a Horizon"
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
  
  // Test 3: Chargement du compte master
  try {
    console.log(`[v0] [PI_TEST] Chargement du compte master...`);
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
    const account = await server.loadAccount(PI_MASTER_ADDRESS!);
    
    const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
    
    diagnostics.tests.masterAccount = {
      passed: true,
      address: PI_MASTER_ADDRESS,
      balance: nativeBalance?.balance || "0",
      sequenceNumber: account.sequenceNumber(),
      message: `Compte master charge, solde: ${nativeBalance?.balance || "0"} PI`
    };
    
  } catch (error: any) {
    console.error(`[v0] [PI_TEST] Erreur chargement compte:`, error.message);
    diagnostics.tests.masterAccount = {
      passed: false,
      error: error.message,
      statusCode: error.response?.status,
      message: error.response?.status === 404 
        ? "Le compte master n'existe pas sur ce reseau. Verifiez l'adresse et le reseau (testnet vs mainnet)."
        : "Impossible de charger le compte master"
    };
    return NextResponse.json(diagnostics, { status: 500 });
  }
  
  // Test 4: Verification de la cle secrete
  try {
    console.log(`[v0] [PI_TEST] Verification de la cle secrete...`);
    const keypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET!);
    const derivedPublicKey = keypair.publicKey();
    
    const keysMatch = derivedPublicKey === PI_MASTER_ADDRESS;
    
    diagnostics.tests.secretKey = {
      passed: keysMatch,
      derivedPublicKey: derivedPublicKey.substring(0, 10) + "...",
      keysMatch: keysMatch,
      message: keysMatch 
        ? "La cle secrete correspond a l'adresse master" 
        : "ERREUR: La cle secrete ne correspond PAS a l'adresse master configuree!"
    };
    
    if (!keysMatch) {
      return NextResponse.json(diagnostics, { status: 400 });
    }
    
  } catch (error: any) {
    console.error(`[v0] [PI_TEST] Erreur verification cle:`, error.message);
    diagnostics.tests.secretKey = {
      passed: false,
      error: error.message,
      message: "La cle secrete est invalide"
    };
    return NextResponse.json(diagnostics, { status: 400 });
  }
  
  // Test 5: Test API Pi (si API key configuree)
  if (PI_API_KEY) {
    try {
      console.log(`[v0] [PI_TEST] Test de l'API Pi...`);
      const apiResponse = await fetch("https://api.minepi.com/v2/me", {
        headers: {
          'Authorization': `Key ${PI_API_KEY}`
        }
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        diagnostics.tests.piApi = {
          passed: true,
          appName: apiData.app_name || apiData.name,
          message: "API Pi accessible"
        };
      } else {
        const errorText = await apiResponse.text();
        diagnostics.tests.piApi = {
          passed: false,
          status: apiResponse.status,
          error: errorText,
          message: "API key invalide ou expiree"
        };
      }
    } catch (error: any) {
      diagnostics.tests.piApi = {
        passed: false,
        error: error.message,
        message: "Impossible de contacter l'API Pi"
      };
    }
  }
  
  // Resume
  const allTestsPassed = Object.values(diagnostics.tests).every((t: any) => t.passed);
  diagnostics.summary = {
    allTestsPassed,
    readyForTransfers: allTestsPassed,
    message: allTestsPassed 
      ? "Configuration OK - Pret pour les transferts Pi" 
      : "Des problemes ont ete detectes"
  };
  
  console.log(`[v0] [PI_TEST] Diagnostics complets:`, JSON.stringify(diagnostics, null, 2));
  
  return NextResponse.json(diagnostics);
}

// POST: Tester un transfert reel (ATTENTION: utilise de vrais Pi testnet!)
export async function POST(req: NextRequest) {
  // Securite: seulement en testnet
  if (!PI_NETWORK_PASSPHRASE?.includes("Testnet")) {
    return NextResponse.json({ 
      error: "Test transfers only allowed on testnet" 
    }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const { destination, amount = 0.001 } = body;
    
    if (!destination) {
      return NextResponse.json({ 
        error: "Destination address required" 
      }, { status: 400 });
    }
    
    // Valider l'adresse
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
      return NextResponse.json({ 
        error: "Invalid Pi/Stellar address format" 
      }, { status: 400 });
    }
    
    console.log(`[v0] [PI_TEST] Test transfert: ${amount} PI vers ${destination}`);
    
    const server = new StellarSdk.Horizon.Server(PI_HORIZON_URL);
    
    // Charger le compte source
    const sourceAccount = await server.loadAccount(PI_MASTER_ADDRESS!);
    
    // Construire la transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: PI_NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.payment({
          destination: destination,
          asset: StellarSdk.Asset.native(),
          amount: amount.toFixed(7),
        })
      )
      .addMemo(StellarSdk.Memo.text("PimPay Test"))
      .setTimeout(180)
      .build();
    
    // Signer
    const keypair = StellarSdk.Keypair.fromSecret(PI_MASTER_SECRET!);
    transaction.sign(keypair);
    
    // Soumettre
    console.log(`[v0] [PI_TEST] Soumission de la transaction...`);
    const result = await server.submitTransaction(transaction);
    
    console.log(`[v0] [PI_TEST] Resultat:`, JSON.stringify(result));
    
    return NextResponse.json({
      success: true,
      hash: result.hash,
      message: `Transfert de ${amount} Pi vers ${destination} reussi!`,
      explorerUrl: `https://pi-blockchain.net/tx/${result.hash}`
    });
    
  } catch (error: any) {
    console.error(`[v0] [PI_TEST] Erreur transfert:`, error);
    
    // Extraire les codes d'erreur Stellar
    const resultCodes = error.response?.data?.extras?.result_codes;
    
    return NextResponse.json({
      success: false,
      error: error.message,
      resultCodes: resultCodes,
      details: error.response?.data || null
    }, { status: 500 });
  }
}
