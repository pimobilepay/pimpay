import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X, Smartphone, Globe, CreditCard } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: { currency: string; address: string }[];
}

export default function DepositModal({ isOpen, onClose, wallets }: DepositModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(wallets[0]?.currency || 'XRP');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentWallet = wallets.find(w => w.currency === selectedCurrency);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Déposer des fonds</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Sélecteur de devise */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {wallets.map((w) => (
              <button
                key={w.currency}
                onClick={() => setSelectedCurrency(w.currency)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCurrency === w.currency 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {w.currency}
              </button>
            ))}
            <button className="px-4 py-2 rounded-xl text-sm font-medium bg-green-600/10 text-green-500 border border-green-600/20 flex items-center gap-2">
              <Smartphone size={14} /> Mobile Money
            </button>
          </div>

          {/* Zone QR Code */}
          <div className="bg-white p-4 rounded-2xl w-fit mx-auto mb-6 shadow-inner">
            <QRCodeSVG value={currentWallet?.address || ""} size={180} />
          </div>

          {/* Adresse cliquable */}
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl">
            <p className="text-xs text-slate-500 mb-2 uppercase font-bold tracking-wider">
              Votre adresse de dépôt {selectedCurrency}
            </p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-blue-400 break-all text-sm font-mono">
                {currentWallet?.address}
              </code>
              <button 
                onClick={() => copyToClipboard(currentWallet?.address || "")}
                className="p-3 bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-95 transition"
              >
                {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-slate-400" />}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
            <Globe size={20} className="text-blue-500 shrink-0 mt-1" />
            <p className="text-xs text-slate-400 leading-relaxed">
              Envoyez uniquement du <span className="text-blue-400 font-bold">{selectedCurrency}</span> à cette adresse via le réseau principal. Les fonds seront crédités après 3 confirmations.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-800/50 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            PimPay Secure Gateway v2.4
          </p>
        </div>
      </div>
    </div>
  );
}
