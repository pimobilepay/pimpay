'use client'

import * as React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Search,
  Loader2,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Calculator,
  Clock,
  BellRing,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  User,
  Zap,
  Coffee,
  TrendingUp,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WorkspaceCustomer {
  id: string
  name: string
  username: string
  phone: string
  avatar?: string
  kycStatus: string
  email?: string | null
  country?: string | null
  firstName?: string | null
  lastName?: string | null
}

interface AgentWorkspaceProps {
  floatBalance: number
  liquidityHealth: number
  todayTransactionsCount: number
  dailyVolume: number
  safeMode: boolean
  currency?: string
  formatCurrency: (amount: number, currency?: string) => string
  onQuickCashIn: (customer: WorkspaceCustomer) => void
  onQuickCashOut: (customer: WorkspaceCustomer) => void
}

interface PendingItem {
  id: string
  reference: string
  amount: number
  netAmount: number
  currency: string
  type: string
  customer: string
  createdAt: string
  expiresAt: string
  remainingSeconds: number
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error || 'Erreur')
  }
  return res.json()
}

/* ------------------------------------------------------------------ */
/*  Shared card                                                        */
/* ------------------------------------------------------------------ */

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.25)]',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  1. Statut en ligne & horaires                                      */
/* ------------------------------------------------------------------ */

type PresenceStatus = 'online' | 'busy' | 'break'

const PRESENCE_CONFIG: Record<
  PresenceStatus,
  { label: string; dot: string; text: string; icon: React.ElementType }
> = {
  online: { label: 'Disponible', dot: 'bg-emerald-500', text: 'text-emerald-400', icon: Zap },
  busy: { label: 'Occupé', dot: 'bg-amber-500', text: 'text-amber-400', icon: Loader2 },
  break: { label: 'En pause', dot: 'bg-slate-500', text: 'text-slate-400', icon: Coffee },
}

function PresenceBar() {
  const [status, setStatus] = React.useState<PresenceStatus>('online')
  const [now, setNow] = React.useState<Date | null>(null)

  React.useEffect(() => {
    const saved = window.localStorage.getItem('pimpay_agent_status') as PresenceStatus | null
    if (saved && PRESENCE_CONFIG[saved]) setStatus(saved)
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 1000 * 30)
    return () => clearInterval(t)
  }, [])

  const update = (s: PresenceStatus) => {
    setStatus(s)
    window.localStorage.setItem('pimpay_agent_status', s)
  }

  const cfg = PRESENCE_CONFIG[status]

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <span className={cn('block h-3 w-3 rounded-full', cfg.dot)} />
            <span
              className={cn(
                'absolute inset-0 rounded-full animate-ping opacity-60',
                status === 'online' ? cfg.dot : 'bg-transparent'
              )}
            />
          </div>
          <div className="min-w-0">
            <p className={cn('text-sm font-semibold', cfg.text)}>{cfg.label}</p>
            <p className="text-[11px] text-slate-500">
              {now
                ? now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                : '--:--'}{' '}
              · Service 08:00 – 20:00
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 shrink-0">
          {(Object.keys(PRESENCE_CONFIG) as PresenceStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => update(s)}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                status === s
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              )}
              aria-pressed={status === s}
            >
              {PRESENCE_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  2. Objectifs & performance du jour                                 */
/* ------------------------------------------------------------------ */

function DailyGoal({
  todayTransactionsCount,
  dailyVolume,
  safeMode,
  formatCurrency,
}: {
  todayTransactionsCount: number
  dailyVolume: number
  safeMode: boolean
  formatCurrency: (amount: number, currency?: string) => string
}) {
  const [goal, setGoal] = React.useState(20)

  React.useEffect(() => {
    const saved = window.localStorage.getItem('pimpay_daily_goal')
    if (saved) {
      const n = parseInt(saved, 10)
      if (!isNaN(n) && n > 0) setGoal(n)
    }
  }, [])

  const updateGoal = (next: number) => {
    const clamped = Math.max(5, Math.min(200, next))
    setGoal(clamped)
    window.localStorage.setItem('pimpay_daily_goal', String(clamped))
  }

  const progress = Math.min(100, Math.round((todayTransactionsCount / goal) * 100))
  const remaining = Math.max(0, goal - todayTransactionsCount)
  const reached = todayTransactionsCount >= goal

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-emerald-500/10">
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Objectif du jour</h3>
            <p className="text-[11px] text-slate-500">Transactions réussies</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateGoal(goal - 5)}
            className="h-7 w-7 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-sm font-bold"
            aria-label="Réduire l'objectif"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-bold text-white">{goal}</span>
          <button
            onClick={() => updateGoal(goal + 5)}
            className="h-7 w-7 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-sm font-bold"
            aria-label="Augmenter l'objectif"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <p className="text-2xl font-bold text-white">
          {todayTransactionsCount}
          <span className="text-sm font-medium text-slate-500"> / {goal}</span>
        </p>
        <Badge
          variant="outline"
          className={cn(
            'gap-1',
            reached
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-white/5 text-slate-300 border-white/10'
          )}
        >
          {reached ? <CheckCircle2 className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {progress}%
        </Badge>
      </div>

      <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            reached ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
        <div>
          <p className="text-[11px] text-slate-500">Restant</p>
          <p className="text-sm font-semibold text-white">
            {reached ? 'Objectif atteint' : `${remaining} transactions`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-slate-500">Volume du jour</p>
          <p className="text-sm font-semibold text-white">
            {safeMode ? '******' : formatCurrency(dailyVolume)}
          </p>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  3. Alerte liquidité                                                */
/* ------------------------------------------------------------------ */

function LiquidityAlert({
  liquidityHealth,
  floatBalance,
  safeMode,
  formatCurrency,
}: {
  liquidityHealth: number
  floatBalance: number
  safeMode: boolean
  formatCurrency: (amount: number, currency?: string) => string
}) {
  if (liquidityHealth >= 40) return null

  const critical = liquidityHealth < 20

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card
        className={cn(
          'p-4 border',
          critical ? 'border-red-500/40 bg-red-500/5' : 'border-amber-500/40 bg-amber-500/5'
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2.5 rounded-xl shrink-0',
              critical ? 'bg-red-500/15' : 'bg-amber-500/15'
            )}
          >
            <AlertTriangle
              className={cn('h-5 w-5', critical ? 'text-red-400' : 'text-amber-400')}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn('text-sm font-semibold', critical ? 'text-red-300' : 'text-amber-300')}>
              {critical ? 'Liquidité critique' : 'Liquidité faible'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              Float : {safeMode ? '******' : formatCurrency(floatBalance)} · Santé{' '}
              {liquidityHealth}%
            </p>
          </div>
          <Link href="/hub/float" className="shrink-0">
            <Button
              size="sm"
              className={cn(
                'rounded-xl border-0 text-white',
                critical ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
              )}
            >
              Réapprovisionner
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  4. Recherche client rapide                                         */
/* ------------------------------------------------------------------ */

function KycBadge({ status }: { status: string }) {
  const verified = status === 'APPROVED' || status === 'VERIFIED'
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[10px]',
        verified
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      )}
    >
      {verified ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
      {verified ? 'KYC vérifié' : 'KYC en attente'}
    </Badge>
  )
}

function QuickCustomerSearch({
  onQuickCashIn,
  onQuickCashOut,
}: {
  onQuickCashIn: (customer: WorkspaceCustomer) => void
  onQuickCashOut: (customer: WorkspaceCustomer) => void
}) {
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [results, setResults] = React.useState<WorkspaceCustomer[]>([])

  const search = async () => {
    if (query.trim().length < 2) {
      setError('Entrez au moins 2 caractères')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/agent/customer?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur de recherche')
      setResults(data.customers || [])
      if (!data.customers || data.customers.length === 0) {
        setError('Aucun client trouvé')
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de recherche')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing && e.keyCode !== 229) {
      search()
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-blue-500/10">
          <Search className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Recherche client rapide</h3>
          <p className="text-[11px] text-slate-500">Nom, téléphone ou username</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Rechercher un client..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <Button
          onClick={search}
          disabled={loading || query.trim().length < 2}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-0"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <div className="mt-3 space-y-2">
        <AnimatePresence>
          {results.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-slate-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {c.name || c.username}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    @{c.username} · {c.phone}
                  </p>
                </div>
                <KycBadge status={c.kycStatus} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={() => onQuickCashIn(c)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                >
                  <ArrowDownLeft className="h-4 w-4 mr-1" />
                  Cash-In
                </Button>
                <Button
                  size="sm"
                  onClick={() => onQuickCashOut(c)}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Cash-Out
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  5. Calculatrice de commission                                      */
/* ------------------------------------------------------------------ */

function CommissionCalculator({
  currency,
  formatCurrency,
}: {
  currency: string
  formatCurrency: (amount: number, currency?: string) => string
}) {
  const [amount, setAmount] = React.useState('')
  const [mode, setMode] = React.useState<'cash-in' | 'cash-out'>('cash-in')

  const { data } = useSWR('/api/agent/fees', fetcher, { revalidateOnFocus: false })

  const depositFee = data?.depositFee ?? 0.02
  const withdrawFee = data?.withdrawFee ?? 0.025
  const agentShare = data?.agentShare ?? 0.5

  const amountNum = parseFloat(amount) || 0
  const rate = mode === 'cash-in' ? depositFee : withdrawFee
  const fee = Math.round(amountNum * rate * 100) / 100
  const agentCommission = Math.round(fee * agentShare * 100) / 100
  const clientNet = mode === 'cash-in' ? amountNum - fee : amountNum

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-violet-500/10">
          <Calculator className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Calculatrice commission</h3>
          <p className="text-[11px] text-slate-500">Estimez frais et gains</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 rounded-xl bg-white/5 p-1">
        <button
          onClick={() => setMode('cash-in')}
          className={cn(
            'rounded-lg py-2 text-xs font-medium transition-colors',
            mode === 'cash-in' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
          )}
        >
          Cash-In
        </button>
        <button
          onClick={() => setMode('cash-out')}
          className={cn(
            'rounded-lg py-2 text-xs font-medium transition-colors',
            mode === 'cash-out' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400'
          )}
        >
          Cash-Out
        </button>
      </div>

      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          placeholder={`Montant en ${currency}`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Frais ({(rate * 100).toFixed(1)}%)</span>
          <span className="font-medium text-white">{formatCurrency(fee, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {mode === 'cash-in' ? 'Crédité au client' : 'Reçu du client'}
          </span>
          <span className="font-medium text-white">{formatCurrency(clientNet, currency)}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-3 py-2.5 border border-emerald-500/20">
          <span className="text-sm font-medium text-emerald-300">Votre commission</span>
          <span className="text-base font-bold text-emerald-400">
            {formatCurrency(agentCommission, currency)}
          </span>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  6. Transactions en attente de confirmation                         */
/* ------------------------------------------------------------------ */

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function PendingConfirmations({
  currency,
  formatCurrency,
}: {
  currency: string
  formatCurrency: (amount: number, currency?: string) => string
}) {
  const { data, mutate } = useSWR<{ items: PendingItem[] }>('/api/agent/pending', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })

  const [relancing, setRelancing] = React.useState<string | null>(null)
  const [relanced, setRelanced] = React.useState<Record<string, boolean>>({})
  const items = data?.items || []

  const relance = async (id: string) => {
    setRelancing(id)
    try {
      const res = await fetch('/api/agent/pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id }),
      })
      if (res.ok) {
        setRelanced((prev) => ({ ...prev, [id]: true }))
        setTimeout(() => setRelanced((prev) => ({ ...prev, [id]: false })), 4000)
      }
    } finally {
      setRelancing(null)
      mutate()
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10">
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">En attente de confirmation</h3>
            <p className="text-[11px] text-slate-500">Le client doit valider</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="bg-white/5 text-slate-300 border-white/10"
        >
          {items.length}
        </Badge>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
          <p className="text-sm text-slate-400">Aucune transaction en attente</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {items.map((tx) => {
              const expired = tx.remainingSeconds <= 0
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{tx.customer}</p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">
                        {tx.reference}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-white">
                        {formatCurrency(tx.amount, tx.currency || currency)}
                      </p>
                      <p
                        className={cn(
                          'text-[11px] font-medium flex items-center gap-1 justify-end',
                          expired ? 'text-red-400' : 'text-amber-400'
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {expired ? 'Expiré' : formatCountdown(tx.remainingSeconds)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={relancing === tx.id || relanced[tx.id]}
                    onClick={() => relance(tx.id)}
                    className="mt-2 w-full rounded-lg border-white/10 bg-transparent text-slate-200 hover:bg-white/10"
                  >
                    {relancing === tx.id ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : relanced[tx.id] ? (
                      <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-400" />
                    ) : (
                      <BellRing className="h-4 w-4 mr-1" />
                    )}
                    {relanced[tx.id] ? 'Rappel envoyé' : 'Relancer le client'}
                  </Button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main export                                                        */
/* ------------------------------------------------------------------ */

export function AgentWorkspace({
  floatBalance,
  liquidityHealth,
  todayTransactionsCount,
  dailyVolume,
  safeMode,
  currency = 'XAF',
  formatCurrency,
  onQuickCashIn,
  onQuickCashOut,
}: AgentWorkspaceProps) {
  return (
    <div className="space-y-4">
      <PresenceBar />
      <LiquidityAlert
        liquidityHealth={liquidityHealth}
        floatBalance={floatBalance}
        safeMode={safeMode}
        formatCurrency={formatCurrency}
      />
      <DailyGoal
        todayTransactionsCount={todayTransactionsCount}
        dailyVolume={dailyVolume}
        safeMode={safeMode}
        formatCurrency={formatCurrency}
      />
      <QuickCustomerSearch
        onQuickCashIn={onQuickCashIn}
        onQuickCashOut={onQuickCashOut}
      />
      <PendingConfirmations currency={currency} formatCurrency={formatCurrency} />
      <CommissionCalculator currency={currency} formatCurrency={formatCurrency} />
    </div>
  )
}

export type { WorkspaceCustomer }
