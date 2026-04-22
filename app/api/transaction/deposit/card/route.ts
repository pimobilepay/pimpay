import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { getAuthUserId } from "@/lib/auth";

const prisma = new PrismaClient();

// Validate card number using Luhn algorithm
function isValidCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length !== 16) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Detect card type from number
function detectCardType(cardNumber: string): "VISA" | "MASTERCARD" | "UNKNOWN" {
  const digits = cardNumber.replace(/\D/g, "");
  if (/^4/.test(digits)) return "VISA";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "MASTERCARD";
  return "UNKNOWN";
}

// Validate expiry date
function isValidExpiry(expiry: string): boolean {
  const [month, year] = expiry.split("/");
  if (!month || !year) return false;
  
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt("20" + year, 10);
  
  if (monthNum < 1 || monthNum > 12) return false;
  
  const now = new Date();
  const expiryDate = new Date(yearNum, monthNum, 0);
  
  return expiryDate > now;
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ success: false, message: "Session expiree. Veuillez vous reconnecter." }, { status: 401 });
    }

    const body = await req.json();
    
    const { 
      amount, 
      currency = "USD", 
      cardNumber, 
      cardExpiry, 
      cardCvv, 
      cardHolder, 
      cardType,
      description 
    } = body;

    // 1. Validation rigoureuse
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, message: "Montant invalide" }, { status: 400 });
    }
    
    if (!cardNumber || !cardExpiry || !cardCvv || !cardHolder) {
      return NextResponse.json({ success: false, message: "Informations de carte incompletes" }, { status: 400 });
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    
    // Validate card number with Luhn algorithm
    if (!isValidCardNumber(cleanCardNumber)) {
      return NextResponse.json({ success: false, message: "Numero de carte invalide" }, { status: 400 });
    }
    
    // Validate expiry
    if (!isValidExpiry(cardExpiry)) {
      return NextResponse.json({ success: false, message: "Carte expiree ou date invalide" }, { status: 400 });
    }
    
    // Validate CVV
    if (!/^\d{3,4}$/.test(cardCvv)) {
      return NextResponse.json({ success: false, message: "CVV invalide" }, { status: 400 });
    }
    
    // Detect and validate card type
    const detectedType = detectCardType(cleanCardNumber);
    if (detectedType === "UNKNOWN") {
      return NextResponse.json({ success: false, message: "Seules les cartes Visa et Mastercard sont acceptees" }, { status: 400 });
    }

    // 2. Récupérer les frais centralisés (carte) - 1.5% for card deposits
    let fee = amount * 0.015;
    try {
      const feeConfig = await getFeeConfig();
      const feeResult = calculateFee(amount, feeConfig, "deposit_card");
      fee = feeResult.feeAmount;
    } catch {
      // Use default 1.5% if fee config not available
    }
    const netAmount = amount - fee;

    // 3. Vérifier ou créer le Wallet de destination
    let wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } }
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          userId,
          currency,
          balance: 0,
          availableBalance: 0,
        }
      });
    }

    // 4. Générer une référence de transaction unique PimPay
    const reference = `CARD-${detectedType}-${uuidv4().split("-")[0].toUpperCase()}`;
    
    // Mask card number for storage (only keep last 4 digits)
    const maskedCard = `****${cleanCardNumber.slice(-4)}`;

    // 5. Créer la transaction en attente (PENDING)
    const transaction = await prisma.transaction.create({
      data: {
        reference,
        amount: parseFloat(String(amount)),
        fee: fee,
        netAmount: netAmount,
        currency,
        type: "DEPOSIT",
        status: "PENDING",
        description: description || `Depot par carte ${detectedType} ${maskedCard}`,
        toUserId: userId,
        toWalletId: wallet.id,
        metadata: {
          paymentMethod: "CARD",
          cardType: detectedType,
          cardLastFour: cleanCardNumber.slice(-4),
          cardHolder: cardHolder,
          initiatedAt: new Date().toISOString()
        }
      }
    });

    // 6. SIMULATION: Dans un environnement de production, vous appelleriez le processeur de paiement ici
    // Pour le test, on simule une validation automatique après 5 secondes
    
    // Simulate card processing (in production, this would be an async webhook from payment provider)
    setTimeout(async () => {
      try {
        // Update transaction status to SUCCESS
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "SUCCESS" }
        });
        
        // Credit the wallet
        await prisma.wallet.update({
          where: { id: wallet!.id },
          data: {
            balance: { increment: netAmount },
            availableBalance: { increment: netAmount }
          }
        });
        
        // Create notification
        await prisma.notification.create({
          data: {
            userId,
            type: "TRANSACTION",
            title: "Depot par carte reussi",
            message: `Votre depot de ${amount} ${currency} par carte ${detectedType} ${maskedCard} a ete credite.`,
            read: false,
            data: { transactionId: transaction.id, reference }
          }
        });
      } catch (err) {
        console.error("Card deposit processing error:", err);
      }
    }, 5000);

    // 7. Log de sécurité pour l'audit bancaire
    await prisma.securityLog.create({
      data: {
        userId,
        action: "CARD_DEPOSIT_INITIATED",
        details: `Ref: ${reference} | Amount: ${amount} ${currency} | Card: ${detectedType} ${maskedCard}`,
        ip: req.headers.get("x-forwarded-for") || "unknown"
      }
    });

    return NextResponse.json({
      success: true,
      reference: transaction.reference,
      transactionId: transaction.id,
      cardType: detectedType,
      maskedCard,
      amount,
      fee,
      netAmount,
      message: "Paiement en cours de traitement"
    });

  } catch (error) {
    console.error("CARD_DEPOSIT_ERROR:", error);
    return NextResponse.json({ success: false, message: "Erreur technique lors de l'initialisation" }, { status: 500 });
  }
}
