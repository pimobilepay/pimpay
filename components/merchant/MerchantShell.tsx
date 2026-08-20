"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Bell, ChevronRight, CreditCard, LayoutDashboard, Menu, QrCode, Settings, Store, Wallet, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/merchant", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/merchant/payments", label: "Encaissements & QR", icon: QrCode },
  { href: "/merchant/transactions", label: "Transactions", icon: CreditCard },
  { href: "/merchant/reports", label: "Rapports", icon: BarChart3 },
  { href: "/merchant/balance", label: "Solde & retraits", icon: Wallet },
  { href: "/merchant/profile", label: "Profil boutique", icon: Store },
]

export default function MerchantShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen bg-[#050814] text-white">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-[#080d1d] p-5 transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/merchant" className="flex items-center gap-3 font-semibold"><span className="grid size-10 place-items-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30"><Store className="size-5" /></span><span>PiMobiPay<span className="block text-xs font-normal text-blue-300">Espace marchand</span></span></Link>
          <button aria-label="Fermer le menu" onClick={() => setOpen(false)} className="lg:hidden"><X className="size-5 text-white/60" /></button>
        </div>
        <nav className="mt-10 flex flex-col gap-2">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/60 transition hover:bg-white/5 hover:text-white", pathname === href && "bg-blue-600/15 text-blue-200 ring-1 ring-blue-500/30")}><Icon className="size-5" />{label}{pathname === href && <ChevronRight className="ml-auto size-4" />}</Link>)}</nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4"><p className="text-xs font-medium text-amber-200">Besoin d'aide ?</p><p className="mt-1 text-xs leading-5 text-white/50">Notre équipe est disponible pour vous accompagner.</p><Link href="/support" className="mt-3 inline-flex text-xs text-amber-200">Contacter le support</Link></div>
      </aside>
      <div className="lg:pl-72"><header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/10 bg-[#050814]/90 px-5 backdrop-blur-xl lg:px-10"><button aria-label="Ouvrir le menu" onClick={() => setOpen(true)} className="lg:hidden"><Menu className="size-6" /></button><div className="hidden lg:block"><p className="text-sm text-white/45">Espace marchand</p><p className="font-medium">Bienvenue dans votre boutique</p></div><div className="flex items-center gap-3"><button aria-label="Notifications" className="rounded-xl border border-white/10 p-2.5 text-white/60 hover:text-white"><Bell className="size-5" /></button><Link href="/settings" aria-label="Paramètres" className="rounded-xl border border-white/10 p-2.5 text-white/60 hover:text-white"><Settings className="size-5" /></Link><div className="hidden size-10 place-items-center rounded-full bg-blue-600/20 text-sm font-semibold text-blue-200 sm:grid">M</div></div></header><main className="mx-auto max-w-7xl p-5 lg:p-10">{children}</main></div>
    </div>
  )
}
