"use client";

import React from 'react';
import { ArrowUpCircle } from 'lucide-react';

// Props ultra-courtes pour coder plus vite
interface PayProps {
  val: number;    // Montant en USD
  rate: number;   // Taux (ex: 600)
  done: (v: number) => void; // Fonction succès
}

const PaymentCinetPay: React.FC<PayProps> = ({ val, rate, done }) => {
  
  const handlePay = () => {
    if (!val || val <= 0) return alert("Montant ?");

    if (typeof window !== "undefined" && window.CinetPay) {
      // Configuration avec tes noms de variables courts
      window.CinetPay.setConfig({
        apiKey: process.env.NEXT_PUBLIC_CP_KEY,
        site_id: process.env.NEXT_PUBLIC_CP_ID,
        notify_url: 'https://pimpay.vercel.app/api/webhook',
        mode: 'PRODUCTION'
      });

      // Lancement du guichet interne
      window.CinetPay.getCheckout({
        transaction_id: `PP-${Date.now()}`,
        amount: Math.floor(val * rate),
        currency: 'XAF',
        channels: 'ALL',
        description: `Depot ${val} USD`,
        customer_name: "Client",
        customer_surname: "PP",
        customer_email: "u@pimpay.pi",
        customer_phone_number: "000",
        customer_address: "BZV",
        customer_city: "BZV",
        customer_country: "CG",
        customer_state: "CG",
        customer_zip_code: "00"
      });

      window.CinetPay.waitResponse((data: any) => {
        if (data.status === "ACCEPTED") {
          done(val);
        }
      });

      window.CinetPay.onError((err: any) => console.error(err));
    }
  };

  return (
    <button 
      onClick={handlePay}
      className="w-full py-4 bg-blue-600 text-white rounded-3xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
    >
      <ArrowUpCircle size={20} />
      DEPÔTER {val > 0 ? `${val}$` : ""}
    </button>
  );
};

export default PaymentCinetPay;
