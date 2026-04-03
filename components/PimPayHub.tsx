'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  QrCode,
  ShieldCheck,
  Wallet,
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
  X,
  Search,
  User,
  ArrowRightLeft,
  RefreshCw,
  Menu
} from 'lucide-react'
import { AgentSidebar } from '@/components/hub/AgentSidebar'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import useSWR from 'swr'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { QRScanner } from '@/components/qr-scanner'

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

interface Customer {
  id: string
  name: string
  username: string
  phone: string
  avatar?: string
  kycStatus: string
}

interface DashboardData {
  success: boolean
  agent: {
    id: string
    name: string
    kycStatus: string
  }
  floatBalance: number
  piBalance: number
  dailyEarnings: {
    pi: number
    xaf: number
  }
  liquidityHealth: number
  dailyVolume: number
  todayTransactionsCount: number
  commissionData: CommissionData[]
  recentTransactions: Transaction[]
  weeklyGrowth: number
}

// Fetcher pour SWR
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Erreur de chargement')
  }
  return res.json()
}

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
          animate={{ width: `${Math.min(health, 100)}%` }}
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

  const { icon: Icon, label, className } = config[status] || config.pending

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

  const { icon: Icon, className } = config[type] || config.transfer

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

// Transaction Modal Component
function TransactionModal({
  isOpen,
  onClose,
  type,
  onSuccess
}: {
  isOpen: boolean
  onClose: () => void
  type: 'cash-in' | 'cash-out'
  onSuccess: () => void
}) {
  const [step, setStep] = React.useState<'search' | 'confirm'>('search')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)
  const [amount, setAmount] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  // Recherche de clients
  const { data: searchResults, isLoading: isSearching } = useSWR(
    searchQuery.length >= 2 ? `/api/agent/customer?q=${encodeURIComponent(searchQuery)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setStep('confirm')
    setSearchQuery('')
  }

  const handleSubmit = async () => {
    if (!selectedCustomer || !amount) return

    setIsLoading(true)
    setError('')

    try {
      const endpoint = type === 'cash-in' ? '/api/agent/cash-in' : '/api/agent/cash-out'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: parseFloat(amount),
          currency: 'XAF'
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la transaction')
      }

      onSuccess()
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setStep('search')
    setSearchQuery('')
    setSelectedCustomer(null)
    setAmount('')
    setError('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'cash-in' ? (
              <>
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                Cash-In
              </>
            ) : (
              <>
                <ArrowUpRight className="h-5 w-5 text-blue-600" />
                Cash-Out
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'search' 
              ? 'Recherchez le client par nom, telephone ou username'
              : `Confirmez le ${type === 'cash-in' ? 'depot' : 'retrait'} pour ${selectedCustomer?.name || selectedCustomer?.username}`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'search' ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isSearching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {searchResults?.customers && searchResults.customers.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.customers.map((customer: Customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-left"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name || customer.username}</p>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {customer.kycStatus}
                    </Badge>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults?.customers?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Aucun client trouve</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {selectedCustomer && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{selectedCustomer.name || selectedCustomer.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setStep('search')}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Montant (XAF)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl font-bold h-14"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                {error}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          {step === 'confirm' && (
            <Button
              onClick={handleSubmit}
              disabled={!amount || isLoading}
              className={type === 'cash-in' 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmer {type === 'cash-in' ? 'le depot' : 'le retrait'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// QR Scanner Modal
function QRScannerModal({
  isOpen,
  onClose,
  onCustomerFound
}: {
  isOpen: boolean
  onClose: () => void
  onCustomerFound: (customer: Customer) => void
}) {
  const [showScanner, setShowScanner] = React.useState(true)
  const [manualCode, setManualCode] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  const handleQRResult = async (data: string) => {
    if (!data) {
      setShowScanner(false)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/agent/customer?q=${encodeURIComponent(data)}`)
      const apiData = await res.json()

      if (!res.ok || !apiData.customers?.length) {
        throw new Error('Client non trouve avec ce QR code')
      }

      onCustomerFound(apiData.customers[0])
      handleClose()
    } catch (err: any) {
      setError(err.message)
      setShowScanner(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSearch = async () => {
    if (!manualCode) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/agent/customer?q=${encodeURIComponent(manualCode)}`)
      const data = await res.json()

      if (!res.ok || !data.customers?.length) {
        throw new Error('Client non trouve')
      }

      onCustomerFound(data.customers[0])
      handleClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setShowScanner(true)
    setManualCode('')
    setError('')
    onClose()
  }

  // Show fullscreen QR scanner if enabled
  if (showScanner && isOpen) {
    return (
      <QRScanner
        onClose={(data?: string) => {
          if (data) {
            handleQRResult(data)
          } else {
            setShowScanner(false)
          }
        }}
      />
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scanner le QR Client
          </DialogTitle>
          <DialogDescription>
            Entrez l&apos;identifiant du client ou utilisez le scanner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-code">Identifiant client</Label>
            <Input
              id="manual-code"
              placeholder="Username ou telephone"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button 
            onClick={() => setShowScanner(true)}
            variant="outline"
            className="w-full"
          >
            <QrCode className="h-4 w-4 mr-2" />
            Ouvrir le scanner
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleManualSearch} disabled={!manualCode || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Rechercher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function PimPayHub() {
  const [safeMode, setSafeMode] = React.useState(false)
  const [selectedTransaction, setSelectedTransaction] = React.useState<string | null>(null)
  const [cashInModalOpen, setCashInModalOpen] = React.useState(false)
  const [cashOutModalOpen, setCashOutModalOpen] = React.useState(false)
  const [qrScannerOpen, setQrScannerOpen] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  // Fetch dashboard data
  const { data, error, isLoading, mutate: refreshDashboard } = useSWR<DashboardData>(
    '/api/agent/dashboard',
    fetcher,
    { 
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true
    }
  )

  const floatBalance = data?.floatBalance || 0
  const dailyEarnings = data?.dailyEarnings || { pi: 0, xaf: 0 }
  const liquidityHealth = data?.liquidityHealth || 0
  const commissionData = data?.commissionData || []
  const recentTransactions = data?.recentTransactions || []
  const weeklyGrowth = data?.weeklyGrowth || 0

  const formatCurrency = (amount: number, currency: string = 'XAF') => {
    if (safeMode) return '******'
    return new Intl.NumberFormat('fr-CM', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(amount) + ` ${currency}`
  }

  const handleTransactionSuccess = () => {
    refreshDashboard()
  }

  const handleQRCustomerFound = (customer: Customer) => {
    // Could open cash-in or cash-out modal with pre-selected customer
    setCashInModalOpen(true)
  }

  // Compute chart colors in JavaScript for recharts
  const chartGreen = '#10b981'

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <GlassCard className="p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erreur de chargement</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => refreshDashboard()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reessayer
          </Button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {/* Ambient Background Effects */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-40 right-1/4 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-6">
            {/* Mobile Header */}
            <div className="flex items-center justify-between lg:hidden mb-4">
              <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 dark:bg-slate-800/50 text-slate-400">
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center justify-center flex-1">
                <h1 className="text-sm font-black text-foreground">PIMPAY</h1>
              </div>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>

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
                    Tableau de bord
                  </h1>
                  <Badge
                    variant="outline"
                    className="mt-0.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                  >
                    Agent Partner
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refreshDashboard()}
                className="rounded-xl"
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-5 w-5 text-muted-foreground', isLoading && 'animate-spin')} />
              </Button>
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
            </div>
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
                    {isLoading ? (
                      <span className="inline-block w-32 h-8 bg-muted animate-pulse rounded" />
                    ) : (
                      formatCurrency(floatBalance)
                    )}
                  </motion.p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {weeklyGrowth !== 0 && (
                    <div className={cn(
                      'flex items-center gap-1.5',
                      weeklyGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      <TrendingUp className={cn('h-4 w-4', weeklyGrowth < 0 && 'rotate-180')} />
                      <span className="text-sm font-semibold">{weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}%</span>
                    </div>
                  )}
                  <LiquidityHealthIndicator health={liquidityHealth} />
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Daily Earnings (Pi)</p>
                  <p className="text-lg font-semibold text-foreground">
                    {isLoading ? (
                      <span className="inline-block w-16 h-6 bg-muted animate-pulse rounded" />
                    ) : (
                      <>{safeMode ? '***' : dailyEarnings.pi} <span className="text-sm text-muted-foreground">Pi</span></>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Daily Earnings (XAF)</p>
                  <p className="text-lg font-semibold text-foreground">
                    {isLoading ? (
                      <span className="inline-block w-20 h-6 bg-muted animate-pulse rounded" />
                    ) : (
                      formatCurrency(dailyEarnings.xaf)
                    )}
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
                    onClick={() => setCashInModalOpen(true)}
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
                    onClick={() => setCashOutModalOpen(true)}
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
                  onClick={() => setQrScannerOpen(true)}
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
                  <span className="text-sm font-semibold">
                    {weeklyGrowth >= 0 ? '+' : ''}{weeklyGrowth}%
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="h-[140px] w-full bg-muted animate-pulse rounded-xl" />
              ) : (
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
                            formatter={(value) => (
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
              )}
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
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <div className="h-10 w-10 bg-muted animate-pulse rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))
                ) : recentTransactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune transaction recente</p>
                ) : (
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
                              {tx.type === 'cash-in' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
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
                )}
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
      </main>

      {/* Modals */}
      <TransactionModal
        isOpen={cashInModalOpen}
        onClose={() => setCashInModalOpen(false)}
        type="cash-in"
        onSuccess={handleTransactionSuccess}
      />
      <TransactionModal
        isOpen={cashOutModalOpen}
        onClose={() => setCashOutModalOpen(false)}
        type="cash-out"
        onSuccess={handleTransactionSuccess}
      />
      <QRScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
        onCustomerFound={handleQRCustomerFound}
      />
    </div>
  )
}
