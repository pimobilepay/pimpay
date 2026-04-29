import { NextResponse } from "next/server";
import { validateAddress, CRYPTO_RULES } from "@/lib/crypto-validator";
import { CRYPTO_ASSETS } from "@/lib/crypto-config";

/**
 * API to verify if a blockchain address exists and is valid
 * For Pi Network: Uses Pi Network Horizon API
 * For Stellar: Uses Stellar Horizon API
 * For EVM chains: Uses RPC endpoints
 * For Tron: Uses TronGrid API
 */

interface VerifyResult {
  valid: boolean;
  exists: boolean;
  network: string;
  address: string;
  balance?: string;
  error?: string;
}

// Verify Pi Network address exists on blockchain
async function verifyPiAddress(address: string): Promise<VerifyResult> {
  try {
    // Pi Network uses Stellar-like API
    const response = await fetch(
      `https://api.minepi.com/v2/accounts/${address}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        exists: true,
        network: "Pi Network",
        address,
        balance: data.balances?.find((b: any) => b.asset_type === "native")?.balance,
      };
    }
    
    // Also try the block explorer API
    const explorerResponse = await fetch(
      `https://blockexplorer.minepi.com/api/v1/accounts/${address}`,
      { next: { revalidate: 60 } }
    );
    
    if (explorerResponse.ok) {
      return {
        valid: true,
        exists: true,
        network: "Pi Network",
        address,
      };
    }
    
    // If 404, the address format is valid but account doesn't exist yet (unfunded)
    if (response.status === 404) {
      return {
        valid: true,
        exists: false,
        network: "Pi Network",
        address,
        error: "Compte non actif sur Pi Network. L'adresse est valide mais le compte n'a pas encore été créé.",
      };
    }
    
    return {
      valid: false,
      exists: false,
      network: "Pi Network",
      address,
      error: "Impossible de vérifier l'adresse Pi Network",
    };
  } catch (error) {
    console.error("Pi address verification error:", error);
    // If API fails, we still validate the format
    return {
      valid: true,
      exists: true, // Assume exists if we can't verify
      network: "Pi Network",
      address,
    };
  }
}

// Verify Stellar address exists
async function verifyStellarAddress(address: string): Promise<VerifyResult> {
  try {
    const response = await fetch(
      `https://horizon.stellar.org/accounts/${address}`,
      { next: { revalidate: 60 } }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        valid: true,
        exists: true,
        network: "Stellar Network",
        address,
        balance: data.balances?.find((b: any) => b.asset_type === "native")?.balance,
      };
    }
    
    if (response.status === 404) {
      return {
        valid: true,
        exists: false,
        network: "Stellar Network",
        address,
        error: "Compte non activé sur Stellar. Minimum 1 XLM requis pour activer.",
      };
    }
    
    return {
      valid: false,
      exists: false,
      network: "Stellar Network",
      address,
      error: "Impossible de vérifier l'adresse Stellar",
    };
  } catch (error) {
    return {
      valid: true,
      exists: true,
      network: "Stellar Network",
      address,
    };
  }
}

// Verify EVM address (Ethereum, BSC, Polygon, Sidra, etc.)
async function verifyEVMAddress(address: string, currency: string): Promise<VerifyResult> {
  const config = CRYPTO_ASSETS[currency];
  const networkName = config?.name || currency;
  
  // EVM addresses don't need to "exist" - any valid format can receive tokens
  // But we can check balance on public RPCs
  try {
    let rpcUrl = "";
    switch (currency) {
      case "ETH":
      case "USDC":
      case "DAI":
        rpcUrl = "https://eth.llamarpc.com";
        break;
      case "BNB":
      case "BUSD":
        rpcUrl = "https://bsc-dataseed1.binance.org";
        break;
      case "MATIC":
        rpcUrl = "https://polygon-rpc.com";
        break;
      case "SDA":
        rpcUrl = "https://mainnet-rpc.sidrachain.com";
        break;
      default:
        // For unknown EVM, just validate format
        return {
          valid: true,
          exists: true,
          network: networkName,
          address,
        };
    }
    
    // Check balance using eth_getBalance
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result !== undefined) {
        return {
          valid: true,
          exists: true,
          network: networkName,
          address,
          balance: (parseInt(data.result, 16) / 1e18).toString(),
        };
      }
    }
    
    return {
      valid: true,
      exists: true,
      network: networkName,
      address,
    };
  } catch (error) {
    return {
      valid: true,
      exists: true,
      network: networkName,
      address,
    };
  }
}

// Verify Tron address
async function verifyTronAddress(address: string): Promise<VerifyResult> {
  try {
    const response = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}`,
      {
        headers: {
          "Accept": "application/json",
        },
        next: { revalidate: 60 },
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const account = data.data[0];
        return {
          valid: true,
          exists: true,
          network: "Tron Network",
          address,
          balance: account.balance ? (account.balance / 1e6).toString() : "0",
        };
      }
    }
    
    // Tron addresses can receive funds even if account doesn't exist yet
    return {
      valid: true,
      exists: true,
      network: "Tron Network",
      address,
    };
  } catch (error) {
    return {
      valid: true,
      exists: true,
      network: "Tron Network",
      address,
    };
  }
}

// Verify XRP address
async function verifyXRPAddress(address: string): Promise<VerifyResult> {
  try {
    const response = await fetch("https://s1.ripple.com:51234/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "account_info",
        params: [{ account: address, ledger_index: "validated" }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result?.account_data) {
        return {
          valid: true,
          exists: true,
          network: "XRP Ledger",
          address,
          balance: (data.result.account_data.Balance / 1e6).toString(),
        };
      }
      if (data.result?.error === "actNotFound") {
        return {
          valid: true,
          exists: false,
          network: "XRP Ledger",
          address,
          error: "Compte non activé sur XRP Ledger. Minimum 10 XRP requis.",
        };
      }
    }
    
    return {
      valid: true,
      exists: true,
      network: "XRP Ledger",
      address,
    };
  } catch (error) {
    return {
      valid: true,
      exists: true,
      network: "XRP Ledger",
      address,
    };
  }
}

// Verify Bitcoin address (limited - just format validation)
async function verifyBTCAddress(address: string): Promise<VerifyResult> {
  // Bitcoin addresses always "exist" if format is valid
  return {
    valid: true,
    exists: true,
    network: "Bitcoin Network",
    address,
  };
}

// Verify Solana address
async function verifySolanaAddress(address: string): Promise<VerifyResult> {
  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAccountInfo",
        params: [address, { encoding: "base64" }],
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.result?.value !== null) {
        return {
          valid: true,
          exists: true,
          network: "Solana",
          address,
          balance: (data.result.value.lamports / 1e9).toString(),
        };
      }
      // Account doesn't exist but can receive SOL
      return {
        valid: true,
        exists: true,
        network: "Solana",
        address,
      };
    }
    
    return {
      valid: true,
      exists: true,
      network: "Solana",
      address,
    };
  } catch (error) {
    return {
      valid: true,
      exists: true,
      network: "Solana",
      address,
    };
  }
}

export async function POST(request: Request) {
  try {
    const { address, currency } = await request.json();
    
    if (!address || !currency) {
      return NextResponse.json(
        { error: "Adresse et devise requises" },
        { status: 400 }
      );
    }
    
    const upperCurrency = currency.toUpperCase();
    
    // First, validate the address format
    const formatValidation = validateAddress(address, upperCurrency);
    if (!formatValidation.isValid) {
      return NextResponse.json({
        valid: false,
        exists: false,
        network: upperCurrency,
        address,
        error: formatValidation.error,
      });
    }
    
    // Then verify existence on blockchain
    let result: VerifyResult;
    
    const rule = CRYPTO_RULES[upperCurrency];
    const config = CRYPTO_ASSETS[upperCurrency];
    
    if (upperCurrency === "PI") {
      result = await verifyPiAddress(address);
    } else if (upperCurrency === "XLM") {
      result = await verifyStellarAddress(address);
    } else if (rule?.prefix === "T" || upperCurrency === "TRX" || upperCurrency === "USDT") {
      result = await verifyTronAddress(address);
    } else if (upperCurrency === "XRP") {
      result = await verifyXRPAddress(address);
    } else if (upperCurrency === "BTC") {
      result = await verifyBTCAddress(address);
    } else if (upperCurrency === "SOL") {
      result = await verifySolanaAddress(address);
    } else if (config?.chain === "EVM" || rule?.prefix === "0x") {
      result = await verifyEVMAddress(address, upperCurrency);
    } else {
      // Default: format is valid, assume exists
      result = {
        valid: true,
        exists: true,
        network: config?.name || upperCurrency,
        address,
      };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Address verification error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    );
  }
}
