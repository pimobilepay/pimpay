"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, CheckCircle2, ChevronRight, Loader2, Search, Tv } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { TVCountry, TVPackage, TVService, TVSubscriber } from "@/lib/tv/types"

export function TVSubscriptionFlow() {
  const router = useRouter()
  const [countries, setCountries] = useState<TVCountry[]>([])
  const [services, setServices] = useState<TVService[]>([])
  const [country, setCountry] = useState("")
  const [countrySearch, setCountrySearch] = useState("")
  const [countryModalOpen, setCountryModalOpen] = useState(false)
  const [service, setService] = useState("")
  const [subscriberNumber, setSubscriberNumber] = useState("")
  const [subscriber, setSubscriber] = useState<TVSubscriber | null>(null)
  const [packages, setPackages] = useState<TVPackage[]>([])
  const [developmentMode, setDevelopmentMode] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/tv/countries").then((r) => r.json()).then((data) => {
      setCountries(data.countries || [])
      setDevelopmentMode(Boolean(data.developmentMode))
    }).catch(() => toast.error("Marchés indisponibles."))
  }, [])

  useEffect(() => {
    if (!country) { setServices([]); return }
    fetch(`/api/tv/services?country=${encodeURIComponent(country)}`).then((r) => r.json()).then((data) => setServices(data.services || [])).catch(() => toast.error("Fournisseurs indisponibles."))
  }, [country])

  const filteredCountries = useMemo(() => countries.filter((item) => item.name.toLowerCase().includes(countrySearch.toLowerCase()) || item.code.toLowerCase().includes(countrySearch.toLowerCase())), [countries, countrySearch])
  const selectedCountry = countries.find((item) => item.code === country)
  const selectedService = services.find((item) => item.id === service)

  async function verify() {
    if (!service || subscriberNumber.trim().length < 3) { toast.error("Sélectionnez un fournisseur et saisissez un numéro valide."); return }
    setLoading(true)
    try {
      const response = await fetch("/api/tv/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serviceId: service, subscriberNumber: subscriberNumber.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setSubscriber(data)
      if (data.status === "ACTIVE") {
        const packagesResponse = await fetch("/api/tv/packages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serviceId: service, subscriberNumber: subscriberNumber.trim() }) })
        const packageData = await packagesResponse.json()
        setPackages(packageData.packages || [])
      }
    } catch { toast.error("Vérification indisponible. Réessayez plus tard.") } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8"><div className="mx-auto max-w-2xl">
    <button onClick={() => router.push("/mpay")} className="mb-8 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-100"><ArrowLeft size={16} /> Retour à MPAY</button>
    <div className="mb-8 flex items-start gap-4"><div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300"><Tv size={26} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">MPAY Services</p><h1 className="mt-1 text-3xl font-black tracking-tight">Abonnements TV</h1><p className="mt-2 text-sm leading-6 text-slate-400">Vérifiez votre compte et consultez les offres disponibles.</p></div></div>
    {developmentMode && <div className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">Mode développement : aucun paiement réel ne sera exécuté.</div>}
    <div className="flex flex-col gap-5"><section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">1. Choisissez votre marché</p><button onClick={() => setCountryModalOpen(true)} className="flex h-16 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-left hover:border-blue-400/60"><span>{selectedCountry?.name || "Sélectionner un pays"}</span><ChevronRight size={18} /></button>{countryModalOpen && <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900 p-3"><div className="relative mb-3"><Search className="absolute left-3 top-3 size-4 text-slate-500" /><input value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} placeholder="Rechercher" className="h-10 w-full rounded-xl border border-white/10 bg-slate-950 pl-9 text-sm outline-none" /></div><div className="grid max-h-56 gap-1 overflow-y-auto">{filteredCountries.map((item) => <button key={item.code} onClick={() => { setCountry(item.code); setService(""); setCountryModalOpen(false) }} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">{item.name}</button>)}</div></div>}</section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">2. Fournisseur et numéro</p><select value={service} onChange={(e) => setService(e.target.value)} className="mb-3 h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm"><option value="">Choisir un fournisseur</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input value={subscriberNumber} onChange={(e) => setSubscriberNumber(e.target.value)} placeholder="Numéro d'abonné" className="h-12 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm outline-none" /><button onClick={verify} disabled={loading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold hover:bg-blue-500 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} Vérifier le compte</button></section>
      {subscriber && <section className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5"><p className="font-bold">{subscriber.name || "Compte vérifié"}</p><p className="mt-1 text-sm text-slate-300">{selectedService?.name} · {subscriber.status}</p>{packages.length > 0 && <div className="mt-4 grid gap-2">{packages.map((item) => <div key={item.id} className="rounded-xl bg-slate-950/60 p-3 text-sm">{item.name}</div>)}</div>}</section>}
    </div>
  </div></main>
}
