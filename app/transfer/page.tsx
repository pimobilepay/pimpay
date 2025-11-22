"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Globe,
  CreditCard,
  ArrowRightCircle,
  ShieldCheck,
  Send,
  Loader2,
  Download,
  Share2,
  Search,
} from "lucide-react";
import jsPDF from "jspdf";

/**
 * Transfer page - PIMPAY
 * - Countries list: small sample (extendable)
 * - Operators per country: sample data
 * - Fee calculation: feePercent + feeFixed
 * - Confirmation modal + OTP simulation
 *
 * Replace fetch() placeholders with your real API endpoints.
 */

type Country = {
  code: string; // ISO2
  name: string;
  flag: string; // emoji
  operators: { id: string; name: string }[];
};

const COUNTRIES: Country[] = [
  {
    code: "CD",
    name: "Congo (DRC)",
    flag: "🇨🇩",
    operators: [
      { id: "mtn", name: "MTN" },
      { id: "orange", name: "Orange" },
      { id: "vodacom", name: "Vodacom" },
    ],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    operators: [
      { id: "moov", name: "Moov" },
      { id: "mtn", name: "MTN" },
      { id: "orange", name: "Orange" },
    ],
  },
  {
    code: "FR",
    name: "France",
    flag: "🇫🇷",
    operators: [
      { id: "orange_fr", name: "Orange" },
      { id: "sfr", name: "SFR" },
      { id: "free", name: "Free Mobile" },
    ],
  },
  // Ajoute tous les pays ici...
];

export default function TransferPage() {
  const router = useRouter();

  // Form state
  const [queryCountry, setQueryCountry] = useState("");
  const [countryCode, setCountryCode] = useState<string>(COUNTRIES[0].code);
  const [operatorId, setOperatorId] = useState<string>(
    COUNTRIES[0].operators[0].id
  );
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState<string>("0");
  const [memo, setMemo] = useState("");

  // Calculation settings (customize per operator or country later)
  const feePercent = 0.02; // 2%
  const feeFixed = 0.05; // fixed fee in π

  // Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [transferResult, setTransferResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Derived data
  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0],
    [countryCode]
  );
  const operators = selectedCountry.operators;

  const numericAmount = parseFloat(amount.replace(",", ".") || "0") || 0;
  const fee = Number((numericAmount * feePercent + feeFixed).toFixed(6));
  const totalToPay = Number((numericAmount + fee).toFixed(6));
  const received = Number((numericAmount).toFixed(6));

  // Search countries
  const filteredCountries = useMemo(() => {
    const q = queryCountry.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.flag.includes(q)
    );
  }, [queryCountry]);

  useEffect(() => {
    // ensure operator exists for selected country
    const opExists = operators.some((o) => o.id === operatorId);
    if (!opExists) setOperatorId(operators[0].id);
    // reset errors on country change
    setError(null);
  }, [countryCode]);

  // ============================
  // Handlers: Preview -> Send
  // ============================
  const handleOpenPreview = () => {
    // basic validation
    if (!phone || numericAmount <= 0) {
      setError("Veuillez renseigner un numéro et un montant valides.");
      return;
    }
    setError(null);
    setPreviewOpen(true);
  };

  const handleStartTransfer = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Placeholder: call your backend to create a pending transfer & send OTP
      // Example payload:
      const payload = {
        country: countryCode,
        operator: operatorId,
        phone,
        amount: numericAmount,
        memo,
      };

      // Simulate API call
      await new Promise((res) => setTimeout(res, 800));

      // Simulate server response with transferId
      const fakeResponse = { transferId: "TX-PMPY-" + Date.now() };
      setTransferResult(fakeResponse);

      // Simulate sending OTP (you should call your SMS/email provider)
      const simulatedOtp = String(Math.floor(100000 + Math.random() * 900000));
      setOtpValue(simulatedOtp);
      setOtpSent(true);

      // present OTP to developer console (remove in prod)
      // eslint-disable-next-line no-console
      console.log("OTP (simulated):", simulatedOtp);

      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setError("Impossible de démarrer le transfert. Réessaie plus tard.");
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpInput || otpInput !== otpValue) {
      setError("Code OTP invalide.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Placeholder: confirm transfer via API
      // const res = await fetch("/api/transfer/confirm", { method: "POST", body: JSON.stringify({ transferId: transferResult.transferId, otp: otpInput }) })
      await new Promise((res) => setTimeout(res, 800));

      // Simulated success
      const successPayload = {
        id: transferResult.transferId,
        status: "success",
        amount: numericAmount,
        total: totalToPay,
        phone,
        operator: operatorId,
        country: countryCode,
        date: new Date().toISOString(),
      };

      setTransferResult(successPayload);
      setOtpSent(false);
      setPreviewOpen(false);
      setIsLoading(false);
      // show success UI (could redirect to details page)
      router.push(`/mpay/details?to=${encodeURIComponent(phone)}&amount=${numericAmount}&status=success&txid=${successPayload.id}&method=${operatorId}&date=${new Date().toISOString()}`);
    } catch (err: any) {
      setIsLoading(false);
      setError("Échec de la confirmation. Réessaie.");
    }
  };

  // ============================
  // Download receipt (PDF)
  // ============================
  const handleDownloadReceipt = () => {
    if (!transferResult) {
      alert("Aucune transaction à télécharger.");
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reçu de Transfert PIMPAY", 10, 20);
    doc.setFontSize(12);
    doc.text(`ID: ${transferResult.id}`, 10, 35);
    doc.text(`Montant: ${transferResult.amount} π`, 10, 45);
    doc.text(`Total facturé: ${transferResult.total} π`, 10, 55);
    doc.text(`Destinataire: ${transferResult.phone}`, 10, 65);
    doc.text(`Opérateur: ${transferResult.operator}`, 10, 75);
    doc.text(`Pays: ${transferResult.country}`, 10, 85);
    doc.text(`Date: ${new Date(transferResult.date).toLocaleString()}`, 10, 95);
    doc.save(`pimpay_receipt_${transferResult.id}.pdf`);
  };

  // ============================
  // Share transfer summary
  // ============================
  const handleShare = async () => {
    if (!transferResult) {
      alert("Aucune transaction à partager.");
      return;
    }
    const text = `PIMPAY - Transfert\nID: ${transferResult.id}\nMontant: ${transferResult.amount} π\nDestinataire: ${transferResult.phone}\nDate: ${new Date(transferResult.date).toLocaleString()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Reçu PIMPAY", text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert("Résumé copié dans le presse-papier");
    }
  };

  return (
    <div className="p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/10 backdrop-blur-lg">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Envoyer un paiement</h1>
      </div>

      {/* Form Card */}
      <div className="p-6 rounded-2xl bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow space-y-4">
        {/* Country selector with search */}
        <label className="block text-sm text-muted-foreground">Pays</label>
        <div className="flex gap-3">
          <div className="w-2/5">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un pays..."
                value={queryCountry}
                onChange={(e) => setQueryCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-transparent border border-white/10"
              />
              <div className="absolute right-2 top-2 text-muted-foreground">
                <Search size={16} />
              </div>
            </div>

            <div className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/5 bg-white/3 p-2">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCountryCode(c.code);
                    setQueryCountry("");
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md flex items-center gap-3 ${c.code === countryCode ? "bg-white/5" : "hover:bg-white/2"}`}
                >
                  <span className="text-lg">{c.flag}</span>
                  <div>
                    <div className="font-medium text-foreground">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.code}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            {/* Operator */}
            <label className="block text-sm text-muted-foreground">Opérateur</label>
            <select
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full px-3 py-3 rounded-lg bg-transparent border border-white/10"
            >
              {operators.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>

            {/* Phone */}
            <label className="block text-sm text-muted-foreground mt-3">Numéro du destinataire</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: +243812345678"
              className="w-full px-3 py-3 rounded-lg bg-transparent border border-white/10"
            />

            {/* Amount */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground">Montant (π)</label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="w-full px-3 py-3 rounded-lg bg-transparent border border-white/10"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground">Mémo (optionnel)</label>
                <input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Note courte"
                  className="w-full px-3 py-3 rounded-lg bg-transparent border border-white/10"
                />
              </div>
            </div>

            {/* Calculation summary */}
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Montant envoyé</div>
                <div className="font-medium">{received} π</div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-sm text-muted-foreground">Frais ({feePercent * 100}% + {feeFixed} π)</div>
                <div className="font-medium">{fee} π</div>
              </div>
              <div className="flex justify-between mt-2">
                <div className="text-sm text-muted-foreground">Total à payer</div>
                <div className="font-bold">{totalToPay} π</div>
              </div>
            </div>

            {/* Error */}
            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleOpenPreview}
            className="flex-1 py-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-300 text-white font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Send size={18} /> Continuer
          </button>

          <button
            onClick={() => {
              setAmount("0");
              setPhone("");
              setMemo("");
            }}
            className="w-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
            title="Reset"
          >
            <Loader2 size={18} />
          </button>
        </div>
      </div>

      {/* Preview / Confirmation Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPreviewOpen(false)} />
          <div className="relative w-full sm:w-[480px] p-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Globe className="text-primary" />
                <div>
                  <div className="font-semibold text-foreground">Confirmer le transfert</div>
                  <div className="text-xs text-muted-foreground">{selectedCountry.flag} {selectedCountry.name}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">Total: {totalToPay} π</div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between"><div className="text-sm text-muted-foreground">À</div><div className="font-medium">{phone}</div></div>
              <div className="flex justify-between"><div className="text-sm text-muted-foreground">Opérateur</div><div className="font-medium">{operators.find(o=>o.id===operatorId)?.name}</div></div>
              <div className="flex justify-between"><div className="text-sm text-muted-foreground">Montant</div><div className="font-medium">{received} π</div></div>
              <div className="flex justify-between"><div className="text-sm text-muted-foreground">Frais</div><div className="font-medium">{fee} π</div></div>
              <div className="flex justify-between"><div className="text-sm text-muted-foreground">Mémo</div><div className="font-medium">{memo || "-"}</div></div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleStartTransfer}
                className="flex-1 py-3 rounded-xl bg-green-500/90 text-white font-semibold flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? "En cours..." : <><ArrowRightCircle size={18}/> Envoyer</>}
              </button>

              <button onClick={() => setPreviewOpen(false)} className="w-32 py-3 rounded-xl bg-white/5 border border-white/10">
                Annuler
              </button>
            </div>

            {/* OTP */}
            {otpSent && (
              <div className="mt-4 border-t pt-4">
                <div className="text-sm text-muted-foreground">Entrez le code OTP reçu</div>
                <div className="flex gap-2 mt-2">
                  <input value={otpInput} onChange={(e)=>setOtpInput(e.target.value)} placeholder="000000" className="flex-1 px-3 py-3 rounded-lg bg-transparent border border-white/10"/>
                  <button onClick={handleConfirmOtp} className="px-4 rounded-lg bg-blue-500 text-white">Confirmer</button>
                </div>
                <div className="text-xs text-muted-foreground mt-2">Si tu n'as pas reçu le code, vérifie ta connexion ou demande un renvoi.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* After-success sticky actions (download/share) */}
      {transferResult && transferResult.status === "success" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-xl p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-center">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Transfert envoyé</div>
            <div className="font-semibold truncate">{transferResult.id} • {transferResult.amount} π</div>
          </div>

          <button onClick={handleDownloadReceipt} className="px-4 py-2 rounded-lg bg-white/10 flex items-center gap-2">
            <Download size={16}/> PDF
          </button>
          <button onClick={handleShare} className="px-4 py-2 rounded-lg bg-white/10 flex items-center gap-2">
            <Share2 size={16}/> Partager
          </button>
        </div>
      )}
    </div>
  );
}
