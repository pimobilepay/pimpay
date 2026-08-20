import Link from "next/link"
import { ArrowLeft, BarChart3, CreditCard, Download, QrCode, Store, Wallet } from "lucide-react"

const content: Record<string, { title: string; description: string; icon: typeof Wallet; actions: string[] }> = {
  payments: { title: "Encaissements & QR", description: "Créez une demande, affichez votre QR marchand et suivez les paiements entrants.", icon: QrCode, actions: ["Afficher le QR marchand", "Créer une demande de paiement", "Consulter les paiements reçus"] },
  transactions: { title: "Transactions", description: "Retrouvez vos opérations, filtrez-les par période et consultez chaque détail.", icon: CreditCard, actions: ["Rechercher une transaction", "Filtrer par période", "Voir les détails d'une opération"] },
  reports: { title: "Rapports", description: "Mesurez les performances de votre boutique grâce à des rapports clairs.", icon: BarChart3, actions: ["Rapport des encaissements", "Rapport des retraits", "Exporter un rapport"] },
  balance: { title: "Solde & retraits", description: "Consultez votre solde disponible et initiez un retrait vers votre wallet.", icon: Wallet, actions: ["Consulter le solde", "Demander un retrait", "Voir les frais et limites"] },
  profile: { title: "Profil boutique", description: "Gérez les informations visibles par vos clients et le statut de votre boutique.", icon: Store, actions: ["Modifier les informations", "Mettre à jour le logo", "Voir le statut de vérification"] },
}

export default async function MerchantSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params
  const item = content[section] ?? content.payments
  const Icon = item.icon
  return <div className="flex max-w-4xl flex-col gap-8"><Link href="/merchant" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft className="size-4" />Retour au tableau de bord</Link><div><span className="inline-grid rounded-xl bg-blue-500/10 p-3 text-blue-300"><Icon className="size-6" /></span><h1 className="mt-5 text-3xl font-semibold">{item.title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">{item.description}</p></div><div className="grid gap-4 sm:grid-cols-2">{item.actions.map((action) => <button key={action} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-blue-400/40"><span><span className="block font-medium">{action}</span><span className="mt-2 block text-xs text-white/40">Disponible depuis votre espace sécurisé</span></span>{action.includes("Exporter") ? <Download className="size-5 text-amber-200" /> : <Icon className="size-5 text-blue-300" />}</button>)}</div><div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-5 text-sm leading-6 text-white/60">Les données et actions de cette section sont limitées à votre profil marchand. Les opérations financières sont validées côté serveur avant exécution.</div></div>
}
