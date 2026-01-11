import { Country, MobileOperator, Bank } from "@/lib/country-data"; // Corrigé : @/lib au lieu de @/data

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface PaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  countryCode: string;
  method: "MOBILE_MONEY" | "BANK_TRANSFER";
  type: "DEPOSIT" | "WITHDRAWAL" | "AIRTIME";
  phoneNumber?: string;
  operatorId?: string;
  bankDetails?: {
    accountNumber: string;
    bic: string;
    accountName: string;
  };
}

class PaymentService {
  private apiUrl = process.env.NEXT_PUBLIC_PAYMENT_GATEWAY_URL;

  /**
   * INITIALISER UN DEPOT (Cash-In)
   * L'utilisateur envoie de l'argent vers Pimpay
   */
  async deposit(data: PaymentRequest) {
    try {
      const response = await fetch(`${this.apiUrl}/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isoStandard: "ISO20022",
          timestamp: new Date().toISOString(),
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Erreur Dépôt:", error);
      throw error;
    }
  }

  /**
   * INITIALISER UN RETRAIT (Cash-Out)
   * Pimpay envoie l'argent vers le Mobile Money ou la Banque de l'utilisateur
   */
  async withdraw(data: PaymentRequest) {
    try {
      const response = await fetch(`${this.apiUrl}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          isoStandard: "ISO20022",
        }),
      });
      return await response.json();
    } catch (error) {
      console.error("Erreur Retrait:", error);
      throw error;
    }
  }

  /**
   * RECHARGE MOBILE (Airtime)
   */
  async buyAirtime(phoneNumber: string, amount: number, operatorId: string) {
    try {
      const response = await fetch(`${this.apiUrl}/airtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, amount, operatorId }),
      });
      return await response.json();
    } catch (error) {
      console.error("Erreur Airtime:", error);
      throw error;
    }
  }

  /**
   * VERIFICATION DE STATUT (Webhook ou Polling)
   */
  async checkTransactionStatus(transactionId: string) {
    const response = await fetch(`${this.apiUrl}/status/${transactionId}`);
    return await response.json();
  }
}

export const paymentService = new PaymentService();
