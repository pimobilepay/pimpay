'use client';

import React from 'react';

// ─── KPICard ───────────────────────────────────────────────────────────────────

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType,
  icon,
  loading = false,
}) => {
  const isPositive = changeType === 'increase';

  if (loading) {
    return (
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-[#1F2937] rounded" />
          <div className="w-11 h-11 rounded-full bg-[#1F2937]" />
        </div>
        <div className="h-8 w-36 bg-[#1F2937] rounded" />
        <div className="h-4 w-20 bg-[#1F2937] rounded" />
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-6 flex flex-col gap-3 hover:border-[#C8A961]/30 transition-all duration-300 group shadow-lg shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400 tracking-wide uppercase">{title}</p>
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(200,169,97,0.2) 0%, rgba(200,169,97,0.08) 100%)',
            border: '1px solid rgba(200,169,97,0.3)',
          }}
        >
          <span style={{ color: '#C8A961' }} className="text-lg">
            {icon}
          </span>
        </div>
      </div>

      {/* Value */}
      <p className="text-3xl font-bold text-white tracking-tight leading-none">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>

      {/* Change */}
      <div className="flex items-center gap-1.5">
        <span
          className={`flex items-center gap-0.5 text-sm font-semibold ${
            isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {isPositive ? (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 3L13 8M8 3L3 8M8 3V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 13L3 8M8 13L13 8M8 13V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-xs text-gray-500">vs last period</span>
      </div>

      {/* Bottom accent line */}
      <div
        className="h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-full mt-1"
        style={{ background: 'linear-gradient(90deg, #C8A961, transparent)' }}
      />
    </div>
  );
};

// ─── StatusBadge ───────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

type StatusConfig = {
  bg: string;
  text: string;
  dot: string;
  border: string;
  label: string;
};

const STATUS_MAP: Record<string, StatusConfig> = {
  SETTLED: {
    bg: 'rgba(16,185,129,0.1)',
    text: '#10B981',
    dot: '#10B981',
    border: 'rgba(16,185,129,0.25)',
    label: 'Settled',
  },
  COMPLETED: {
    bg: 'rgba(16,185,129,0.1)',
    text: '#10B981',
    dot: '#10B981',
    border: 'rgba(16,185,129,0.25)',
    label: 'Completed',
  },
  PROCESSING: {
    bg: 'rgba(59,130,246,0.1)',
    text: '#60A5FA',
    dot: '#60A5FA',
    border: 'rgba(59,130,246,0.25)',
    label: 'Processing',
  },
  PENDING: {
    bg: 'rgba(245,158,11,0.1)',
    text: '#F59E0B',
    dot: '#F59E0B',
    border: 'rgba(245,158,11,0.25)',
    label: 'Pending',
  },
  PENDING_AUTH: {
    bg: 'rgba(245,158,11,0.1)',
    text: '#F59E0B',
    dot: '#F59E0B',
    border: 'rgba(245,158,11,0.25)',
    label: 'Pending Auth',
  },
  REJECTED: {
    bg: 'rgba(239,68,68,0.1)',
    text: '#F87171',
    dot: '#F87171',
    border: 'rgba(239,68,68,0.25)',
    label: 'Rejected',
  },
  FAILED: {
    bg: 'rgba(239,68,68,0.1)',
    text: '#F87171',
    dot: '#F87171',
    border: 'rgba(239,68,68,0.25)',
    label: 'Failed',
  },
  RETURNED: {
    bg: 'rgba(249,115,22,0.1)',
    text: '#FB923C',
    dot: '#FB923C',
    border: 'rgba(249,115,22,0.25)',
    label: 'Returned',
  },
  RECEIVED: {
    bg: 'rgba(139,92,246,0.1)',
    text: '#A78BFA',
    dot: '#A78BFA',
    border: 'rgba(139,92,246,0.25)',
    label: 'Received',
  },
  VALIDATED: {
    bg: 'rgba(20,184,166,0.1)',
    text: '#2DD4BF',
    dot: '#2DD4BF',
    border: 'rgba(20,184,166,0.25)',
    label: 'Validated',
  },
};

const DEFAULT_STATUS: StatusConfig = {
  bg: 'rgba(107,114,128,0.1)',
  text: '#9CA3AF',
  dot: '#9CA3AF',
  border: 'rgba(107,114,128,0.25)',
  label: '',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const key = status?.toUpperCase().replace(/\s+/g, '_');
  const config = STATUS_MAP[key] ?? { ...DEFAULT_STATUS, label: status };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const dotSize = {
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${sizeClasses}`}
      style={{
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
      }}
    >
      <span
        className={`${dotSize} rounded-full flex-shrink-0`}
        style={{
          background: config.dot,
          boxShadow: `0 0 6px ${config.dot}`,
        }}
      />
      {config.label || status}
    </span>
  );
};

// ─── AmountDisplay ─────────────────────────────────────────────────────────────

interface AmountDisplayProps {
  amount: number;
  currency: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  colorBySign?: boolean;
}

const formatAmount = (amount: number, currency: string, showSign?: boolean): string => {
  const cur = currency?.toUpperCase();
  const absAmount = Math.abs(amount);
  const sign = showSign ? (amount >= 0 ? '+' : '−') : amount < 0 ? '−' : '';

  if (cur === 'XAF' || cur === 'XOF') {
    // Space-separated thousands, no decimals, FCFA suffix
    const formatted = Math.round(absAmount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
    return `${sign}${formatted} FCFA`;
  }

  if (cur === 'EUR') {
    const formatted = absAmount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}€${absAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  if (cur === 'USD') {
    const formatted = absAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${formatted}`;
  }

  // Generic fallback
  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${formatted} ${cur}`;
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency,
  size = 'md',
  showSign = false,
  colorBySign = false,
}) => {
  const formatted = formatAmount(amount, currency, showSign);

  const sizeClasses = {
    sm: 'text-sm font-medium',
    md: 'text-base font-semibold',
    lg: 'text-xl font-bold',
    xl: 'text-3xl font-bold tracking-tight',
  }[size];

  let colorClass = 'text-white';
  if (colorBySign) {
    if (amount > 0) colorClass = 'text-emerald-400';
    else if (amount < 0) colorClass = 'text-red-400';
    else colorClass = 'text-gray-400';
  }

  const cur = currency?.toUpperCase();
  const isXAF = cur === 'XAF' || cur === 'XOF';

  // Split main value from suffix for XAF/XOF to style the suffix differently
  if (isXAF && size !== 'sm' && size !== 'md') {
    const parts = formatted.split(' FCFA');
    return (
      <span className={`${sizeClasses} ${colorClass} tabular-nums`}>
        {parts[0]}
        <span
          className={`font-normal ml-1 ${
            size === 'xl' ? 'text-lg' : 'text-sm'
          } opacity-70`}
        >
          FCFA
        </span>
      </span>
    );
  }

  return (
    <span className={`${sizeClasses} ${colorClass} tabular-nums`}>
      {formatted}
    </span>
  );
};
