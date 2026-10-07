'use client'

import * as React from 'react'
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Copy, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface HubTransactionDetail {
  id: string
  type: 'cash-in' | 'cash-out' | 'transfer'
  amount: number
  currency: string
  status: 'success' | 'pending' | 'issue' | string
  customer: string
  timestamp: string
  reference: string
  avatar?: string | null
  commission?: number
  createdAt?: string
  fullReference?: string
  customerFullName?: string
  customerUsername?: string | null
  rawType?: string
  rawStatus?: string
  fee?: number
  netAmount?: number
  description?: string | null
  direction?: 'in' | 'out'
  isFloatMovement?: boolean
  source?: string
}

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: 'Depot (Cash-in)',
  WITHDRAW: 'Retrait (Cash-out)',
  TRANSFER: 'Transfert',
  PAYMENT: 'Paiement',
  EXCHANGE: 'Echange',
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  SUCCESS: { label: 'Reussie', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  COMPLETED: { label: 'Reussie', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  PENDING: { label: 'En attente', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  PENDING_CONFIRMATION: { label: 'Confirmation client', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  REJECTED: { label: 'Refusee', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  EXPIRED: { label: 'Expiree', className: 'bg-muted text-muted-foreground border-border' },
  FAILED: { label: 'Echouee', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-sm font-medium text-foreground text-right break-all', mono && 'font-mono text-xs')}>
        {value}
      </span>
    </div>
  )
}

export function HubTransactionDetailModal({
  transaction,
  onClose,
  formatCurrency,
}: {
  transaction: HubTransactionDetail | null
  onClose: () => void
  formatCurrency: (amount: number, currency?: string) => string
}) {
  const [copied, setCopied] = React.useState(false)
  if (!transaction) return null

  const tx = transaction
  const isIncoming = tx.direction ? tx.direction === 'in' : tx.type === 'cash-in'
  const rawStatus = (tx.rawStatus || tx.status || '').toUpperCase()
  const status = STATUS_STYLES[rawStatus] ?? {
    label: rawStatus || 'Inconnu',
    className: 'bg-muted text-muted-foreground border-border',
  }
  const reference = tx.fullReference || tx.reference
  const name = tx.customerFullName || tx.customer
  const date = tx.createdAt ? new Date(tx.createdAt) : null

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      toast.success('Reference copiee')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copie impossible')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Details de la transaction</DialogTitle>
          <DialogDescription>{TYPE_LABELS[tx.rawType || ''] || (isIncoming ? 'Entree' : 'Sortie')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/40 p-5 text-center">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              isIncoming ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
            )}
          >
            {isIncoming ? <ArrowDownLeft className="size-6" /> : <ArrowUpRight className="size-6" />}
          </div>
          <p className={cn('text-3xl font-bold tabular-nums', isIncoming ? 'text-emerald-500' : 'text-foreground')}>
            {isIncoming ? '+' : '-'}
            {formatCurrency(tx.amount, tx.currency)}
          </p>
          <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', status.className)}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border p-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted flex items-center justify-center">
            {tx.isFloatMovement ? (
              <Wallet className="size-5 text-muted-foreground" />
            ) : tx.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tx.avatar} alt={name} className="h-full w-full object-cover" />
            ) : (
              <User className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{isIncoming ? 'De' : 'Vers'}</p>
            <p className="font-semibold text-foreground truncate">{name}</p>
            {tx.customerUsername && (
              <p className="text-xs text-muted-foreground truncate">@{tx.customerUsername}</p>
            )}
          </div>
        </div>

        <div className="divide-y rounded-2xl border px-4">
          <Row label="Montant" value={formatCurrency(tx.amount, tx.currency)} />
          <Row label="Frais" value={formatCurrency(tx.fee ?? 0, tx.currency)} />
          <Row label="Montant net" value={formatCurrency(tx.netAmount ?? tx.amount, tx.currency)} />
          <Row
            label="Commission gagnee"
            value={
              <span className={cn((tx.commission ?? 0) > 0 && 'text-emerald-500')}>
                {formatCurrency(tx.commission ?? 0, tx.currency)}
              </span>
            }
          />
          <Row label="Devise" value={tx.currency} />
          <Row label="Canal" value={tx.source === 'hub' ? 'PimPay Hub (agent)' : 'Application'} />
          {date && (
            <Row
              label="Date"
              value={date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
            />
          )}
          {tx.description && <Row label="Description" value={tx.description} />}
          <Row label="ID" value={tx.id} mono />
        </div>

        <button
          type="button"
          onClick={copyReference}
          className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-3 py-2 text-left hover:bg-muted"
        >
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Reference</span>
            <span className="block truncate font-mono text-xs text-foreground">{reference}</span>
          </span>
          {copied ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="size-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        <Button onClick={onClose} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
          Fermer
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default HubTransactionDetailModal
