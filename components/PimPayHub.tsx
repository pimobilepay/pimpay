'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  QrCode,
  ShieldCheck,
  Wallet,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Headphones,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'

// Types
interface Transaction {
  id: string
  type: 'cash-in' | 'cash-out' | 'transfer'
  amount: number
  currency: string
  status: 'success' | 'pending' | 'issue'
  customer: string
  timestamp: string
  reference: string
}

interface CommissionData {
  day: string
  commission: number
  transactions: number
}

// Mock Data
const commissionData: CommissionData[] = [
  { day: 'Mon', commission: 12500, transactions: 45 },
  { day: 'Tue', commission: 18200, transactions: 62 },
  { day: 'Wed', commission: 15800, transactions: 53 },
  { day: 'Thu', commission: 22400, transactions: 78 },
  { day: 'Fri', commission: 28100, transactions: 95 },
  { day: 'Sat', commission: 31500, transactions: 108 },
  { day: 'Sun', commission: 24800, transactions: 82 },
]

const recentTransactions: Transaction[] = [
  {
    id: '1',
    type: 'cash-in',
    amount: 150000,
    currency: 'XAF',
    status: 'success',
    customer: 'Marie K.',
    timestamp: '14:32',
    reference: 'TXN-7842',
  },
  {
    id: '2',
    type: 'cash-out',
    amount: 75000,
    currency: 'XAF',
    status: 'pending',
    customer: 'Jean P.',
    timestamp: '14:28',
    reference: 'TXN-7841',
  },
  {
    id: '3',
    type: 'cash-in',
    amount: 250000,
    currency: 'XAF',
    status: 'success',
    customer: 'Amadou B.',
    timestamp: '14:15',
    reference: 'TXN-7840',
  },
  {
    id: '4',
    type: 'transfer',
    amount: 45000,
    currency: 'XAF',
    status: 'issue',
    customer: 'Sophie L.',
    timestamp: '13:58',
    reference: 'TXN-7839',
  },
  {
    id: '5',
    type: 'cash-out',
    amount: 180000,
    currency: 'XAF',
    status: 'success',
    customer: 'Paul M.',
    timestamp: '13:45',
    reference: 'TXN-7838',
  },
]

// Components
function LiquidityHealthIndicator({ health }: { health: number }) {
  const getColor = () => {
    if (health >= 80) return 'bg-emerald-500'
    if (health >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', getColor())}
          initial={{ width: 0 }}
          animate={{ width: `${health}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs text-muted-foreground font-medium">{health}%</span>
    </div>
  )
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const config = {
    success: {
      icon: CheckCircle2,
      label: 'Success',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    pending: {
      icon: Loader2,
      label: 'Pending',
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    issue: {
      icon: AlertCircle,
      label: 'Issue',
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
    },
  }

  const { icon: Icon, label, className } = config[status]

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', className)}>
      <Icon className={cn('h-3 w-3', status === 'pending' && 'animate-spin')} />
      {label}
    </Badge>
  )
}

function TransactionIcon({ type }: { type: Transaction['type'] }) {
  const config = {
    'cash-in': {
      icon: ArrowDownLeft,
      className: 'bg-emerald-500/10 text-emerald-600',
    },
    'cash-out': {
      icon: ArrowUpRight,
      className: 'bg-blue-500/10 text-blue-600',
    },
    transfer: {
      icon: ArrowRightLeft,
      className: 'bg-violet-500/10 text-violet-600',
    },
  }

  const { icon: Icon, className } = config[type]

  return (
    <div className={cn('p-2 rounded-xl', className)}>
      <Icon className="h-4 w-4" />
    </div>
  )
}

function GlassCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:bg-slate-900/70 dark:border-slate-700/50',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/50 before:to-transparent before:pointer-events-none dark:before:from-slate-800/50',
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// Main Component
export default function PimPayHub() {
  const [safeMode, setSafeMode] = React.useState(false)
  const [selectedTransaction, setSelectedTransaction] = React.useState<string | null>(null)

  const floatBalance = 2847500
  const dailyEarnings = { pi: 15.8, xaf: 47400 }
  const liquidityHealth = 87

  const formatCurrency = (amount: number, currency: string = 'XAF') => {
    if (safeMode) return '******'
    return new Intl.NumberFormat('fr-CM', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ` ${currency}`
  }

  // Compute chart colors in JavaScript for recharts
  const chartGreen = '#10b981'
  const chartGreenFaded = 'rgba(16, 185, 129, 0.1)'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                PimPay Hub
              </h1>
              <Badge
                variant="outline"
                className="mt-0.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
              >
                Partner
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSafeMode(!safeMode)}
            className="rounded-xl"
          >
            {safeMode ? (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Eye className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </motion.header>

        {/* Liquidity Node */}
        <GlassCard className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium">Float Balance</p>
              <motion.p
                key={safeMode ? 'hidden' : 'visible'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-3xl font-bold tracking-tight text-foreground mt-1"
              >
                {formatCurrency(floatBalance)}
              </motion.p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-semibold">+12.5%</span>
              </div>
              <LiquidityHealthIndicator health={liquidityHealth} />
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Daily Earnings (Pi)</p>
              <p className="text-lg font-semibold text-foreground">
                {safeMode ? '***' : dailyEarnings.pi} <span className="text-sm text-muted-foreground">Pi</span>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Daily Earnings (XAF)</p>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(dailyEarnings.xaf)}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Transaction Terminal */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 border-0"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowDownLeft className="h-5 w-5" />
                  <span className="text-xs font-medium">Cash-In</span>
                </div>
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                className="w-full h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 border-0"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowUpRight className="h-5 w-5" />
                  <span className="text-xs font-medium">Cash-Out</span>
                </div>
              </Button>
            </motion.div>
          </div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 dark:from-white dark:to-slate-100 dark:text-slate-900 dark:hover:from-slate-100 dark:hover:to-slate-200 shadow-xl border-0"
              size="lg"
            >
              <QrCode className="h-5 w-5 mr-2" />
              <span className="font-semibold">Scan Customer QR</span>
            </Button>
          </motion.div>
        </div>

        {/* Agent Analytics */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Commission Growth</h3>
              <p className="text-sm text-muted-foreground">This week</p>
            </div>
            <div className="flex items-center gap-1 text-emerald-600">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-semibold">+23%</span>
            </div>
          </div>

          <ChartContainer
            config={{
              commission: {
                label: 'Commission',
                color: chartGreen,
              },
            }}
            className="h-[140px] w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={commissionData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartGreen} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartGreen} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span className="font-semibold">{Number(value).toLocaleString()} XAF</span>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  stroke={chartGreen}
                  strokeWidth={2}
                  fill="url(#commissionGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </GlassCard>

        {/* Operation Ledger */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Recent Operations</h3>
            </div>
            <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-foreground">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {recentTransactions.map((tx, index) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedTransaction(selectedTransaction === tx.id ? null : tx.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    'hover:bg-slate-100/50 dark:hover:bg-slate-800/50',
                    selectedTransaction === tx.id && 'bg-slate-100/80 dark:bg-slate-800/80'
                  )}
                >
                  <TransactionIcon type={tx.type} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground truncate">{tx.customer}</p>
                      <p className={cn(
                        'font-semibold tabular-nums',
                        tx.type === 'cash-in' ? 'text-emerald-600' : 'text-foreground'
                      )}>
                        {tx.type === 'cash-in' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{tx.timestamp}</span>
                        <span className="text-xs text-muted-foreground">|</span>
                        <span className="text-xs text-muted-foreground font-mono">{tx.reference}</span>
                      </div>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </GlassCard>

        {/* Security & Tools */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/30 transition-colors">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium text-center text-muted-foreground">KYC</span>
            </GlassCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <GlassCard className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/30 transition-colors">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <Headphones className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-center text-muted-foreground">Support</span>
            </GlassCard>
          </motion.div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <GlassCard
              className={cn(
                'p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                safeMode ? 'border-amber-500/30 bg-amber-500/5' : 'hover:border-slate-500/30'
              )}
              onClick={() => setSafeMode(!safeMode)}
            >
              <div className={cn(
                'p-2.5 rounded-xl',
                safeMode ? 'bg-amber-500/20' : 'bg-slate-500/10'
              )}>
                <ShieldCheck className={cn(
                  'h-5 w-5',
                  safeMode ? 'text-amber-600' : 'text-slate-600'
                )} />
              </div>
              <span className="text-xs font-medium text-center text-muted-foreground">
                {safeMode ? 'Safe On' : 'Safe Mode'}
              </span>
            </GlassCard>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-xs text-muted-foreground">
            Secured by PimPay Network
          </p>
        </motion.footer>
      </div>
    </div>
  )
}
