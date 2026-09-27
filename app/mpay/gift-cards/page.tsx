"use client";

import { useEffect, useState } from "react";
import { Gift, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

interface GiftCardProduct { id: number; productName: string; brand: { brandName: string }; country: { isoName: string; currencyCode: string }; denominationType: string; fixedRecipientDenominations?: number[]; minRecipientDenomination?: number; maxRecipientDenomination?: number; }

export default function GiftCardsPage() {
  const [products, setProducts] = useState<GiftCardProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GiftCardProduct | null>(null);
  const [amount, setAmount] = useState(25);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [buying, setBuying] = useState(false);

  useEffect(() => { fetch("/api/mpay/gift-cards/products").then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error); setProducts(data.products ?? []); }).catch((e) => toast.error(e.message)).finally(() => setLoading(false)); }, []);

  async function buy() {
    if (!selected || !recipientEmail) return toast.error("Renseignez l'adresse e-mail du bénéficiaire");
    setBuying(true);
    try { const response = await fetch("/api/mpay/gift-cards/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selected.id, amount, recipientEmail }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); toast.success("Gift card achetée", { description: "Le code a été envoyé au bénéficiaire." }); setSelected(null); setRecipientEmail(""); } catch (e) { toast.error(e instanceof Error ? e.message : "Achat impossible"); } finally { setBuying(false); }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8"><div className="mx-auto max-w-6xl"><div className="mb-8 flex items-center gap-4"><div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600"><Gift aria-hidden="true" /></div><div><p className="text-xs font-black uppercase tracking-[0.2em] text-pink-300">MPay Gift Cards</p><h1 className="text-2xl font-black sm:text-3xl">Offrez instantanément</h1><p className="text-sm text-slate-400">Choisissez une marque, un montant et payez avec votre wallet MPay.</p></div></div>
    {loading ? <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" /> Chargement du catalogue Reloadly…</div> : products.length === 0 ? <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">Aucune gift card disponible pour le moment.</div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <button key={product.id} onClick={() => { setSelected(product); setAmount(product.fixedRecipientDenominations?.[0] ?? product.minRecipientDenomination ?? 25); }} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:-translate-y-1 hover:border-pink-400/50"><ShoppingBag className="mb-8 text-pink-300" /><p className="font-black">{product.brand?.brandName ?? product.productName}</p><p className="mt-1 text-xs text-slate-400">{product.country?.isoName} · {product.country?.currencyCode}</p></button>)}</div>}
    {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6"><h2 className="text-xl font-black">{selected.brand?.brandName ?? selected.productName}</h2><label className="mt-5 block text-xs font-bold text-slate-400">Montant ({selected.country?.currencyCode})</label><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={selected.minRecipientDenomination} max={selected.maxRecipientDenomination} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white" /><label className="mt-4 block text-xs font-bold text-slate-400">E-mail du bénéficiaire</label><input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="client@exemple.com" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-white" /><div className="mt-6 flex gap-3"><button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">Annuler</button><button onClick={buy} disabled={buying} className="flex-1 rounded-xl bg-pink-600 px-4 py-3 text-sm font-bold disabled:opacity-50">{buying ? "Traitement…" : "Acheter"}</button></div></div></div>}
  </div></main>;
}

export const dynamic = "force-dynamic";
