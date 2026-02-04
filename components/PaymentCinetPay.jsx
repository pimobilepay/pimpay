"use client";

import { useEffect } from 'react';

// Interface moved outside component
const PaymentCinetPayInterface = {
  amount: 0,
  currency: '',
  transactionId: '',
  onSuccess: () => {},
  onError: () => {}
};

export default function PaymentCinetPay({ amount, currency, transactionId, onSuccess, onError }) {
  useEffect(() => {
    // CinetPay SDK initialization logic here
    if (typeof window !== 'undefined' && window.CinetPay) {
      window.CinetPay.setConfig({
        apikey: process.env.NEXT_PUBLIC_CINETPAY_API_KEY,
        site_id: process.env.NEXT_PUBLIC_CINETPAY_SITE_ID,
        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`
      });
    }
  }, []);

  const handlePayment = () => {
    if (typeof window !== 'undefined' && window.CinetPay) {
      window.CinetPay.getCheckout({
        transaction_id: transactionId,
        amount: amount,
        currency: currency,
        channels: 'ALL',
        description: 'Paiement PimPay',
        customer_name: 'Client',
        customer_surname: 'PimPay',
        customer_email: 'client@pimpay.com',
        customer_phone_number: '0000000000',
        customer_address: 'Abidjan',
        customer_city: 'Abidjan',
        customer_country: 'CI',
        customer_state: 'CI',
        customer_zip_code: '00000',
      });

      window.CinetPay.waitResponse((data) => {
        if (data.status === "REFUSED") {
          if (onError) onError(data);
        } else if (data.status === "ACCEPTED") {
          if (onSuccess) onSuccess(data);
        }
      });

      window.CinetPay.onError((data) => {
        if (onError) onError(data);
      });
    }
  };

  return (
    <button
      onClick={handlePayment}
      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors"
    >
      Payer avec CinetPay
    </button>
  );
}
