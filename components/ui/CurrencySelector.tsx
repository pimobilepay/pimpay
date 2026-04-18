'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TimelineStatus = 'success' | 'processing' | 'pending' | 'error';

export interface TimelineEvent {
  id: string;
  timestamp: string | Date;
  status: TimelineStatus;
  title: string;
  description?: string;
  actor?: string;
  icon?: React.ReactNode;
}

// ─────────────────────────────────────────────
// Currency data
// ─────────────────────────────────────────────

interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
  rateToXAF: number;
}

const CURRENCY_DATA: Record<string, CurrencyInfo> = {
  XAF: { code: 'XAF', name: 'CFA Franc BEAC', flag: '🌍', rateToXAF: 1 },
  XOF: { code: 'XOF', name: 'CFA Franc BCEAO', flag: '🌎', rateToXAF: 1 },
  EUR: { code: 'EUR', name: 'Euro', flag: '🇪🇺', rateToXAF: 655.957 },
  USD: { code: 'USD', name: 'US Dollar', flag: '🇺🇸', rateToXAF: 601.32 },
  GBP: { code: 'GBP', name: 'British Pound', flag: '🇬🇧', rateToXAF: 762.45 },
  NGN: { code: 'NGN', name: 'Naira nigerien', flag: '🇳🇬', rateToXAF: 0.38 },
  GHS: { code: 'GHS', name: 'Ghanaian Cedi', flag: '🇬🇭', rateToXAF: 42.1 },
  MAD: { code: 'MAD', name: 'Moroccan Dirham', flag: '🇲🇦', rateToXAF: 60.3 },
  CDF: { code: 'CDF', name: 'Franc Congolais', flag: '🇨🇩', rateToXAF: 0.215 },
  AED: { code: 'AED', name: 'Dirham emiratis', flag: '🇦🇪', rateToXAF: 163.71 },
  MGA: { code: 'MGA', name: 'Ariary malgache', flag: '🇲🇬', rateToXAF: 0.134 },
};

const DEFAULT_CURRENCIES = ['XAF', 'XOF', 'EUR', 'USD', 'CDF', 'AED', 'NGN', 'MGA'];

// ─────────────────────────────────────────────
// CurrencySelector
// ─────────────────────────────────────────────

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  currencies?: string[];
  showFlag?: boolean;
  showRate?: boolean;
  disabled?: boolean;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  currencies = DEFAULT_CURRENCIES,
  showFlag = true,
  showRate = true,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = CURRENCY_DATA[value] ?? {
    code: value,
    name: value,
    flag: '💱',
    rateToXAF: 0,
  };

  const filtered = currencies
    .map((c) => CURRENCY_DATA[c] ?? { code: c, name: c, flag: '💱', rateToXAF: 0 })
    .filter(
      (c) =>
        c.code.toLowerCase().includes(search.toLowerCase()) ||
        c.name.toLowerCase().includes(search.toLowerCase())
    );

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatRate = (rate: number, code: string) => {
    if (code === 'XAF') return '1 XAF = 1 XAF';
    return `1 ${code} = ${rate.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} XAF`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={[
          'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl',
          'bg-[#0f1117] border transition-all duration-200 text-left',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c]',
          open
            ? 'border-[#c9a84c] shadow-[0_0_0_3px_rgba(201,168,76,0.15)]'
            : 'border-[#2a2d3a] hover:border-[#3d4155]',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        ].join(' ')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          {showFlag && (
            <span className="text-2xl leading-none select-none" aria-hidden="true">
              {selected.flag}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white tracking-wide">
              {selected.code}
            </p>
            <p className="text-xs text-[#6b7280] truncate">{selected.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showRate && selected.code !== 'XAF' && (
            <span className="text-xs text-[#c9a84c] font-mono bg-[#c9a84c]/10 px-2 py-0.5 rounded-md hidden sm:inline">
              {formatRate(selected.rateToXAF, selected.code)}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-[#6b7280] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      <div
        className={[
          'absolute z-50 mt-2 w-full rounded-xl overflow-hidden',
          'bg-[#0d0f18] border border-[#2a2d3a]',
          'shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)]',
          'transition-all duration-200 origin-top',
          open
            ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none',
        ].join(' ')}
        role="listbox"
        aria-label="Currency"
      >
        {/* Search */}
        <div className="p-3 border-b border-[#1e2130]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b5563]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency…"
              className={
                'w-full bg-[#0f1117] border border-[#2a2d3a] rounded-lg py-2 pl-9 pr-3 ' +
                'text-sm text-white placeholder-[#4b5563] ' +
                'focus:outline-none focus:border-[#c9a84c] transition-colors'
              }
            />
          </div>
        </div>

        {/* List */}
        <ul className="max-h-56 overflow-y-auto py-1 scrollbar-thin" role="listbox">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-[#4b5563]">
              No currencies found
            </li>
          ) : (
            filtered.map((c) => {
              const isSelected = c.code === value;
              return (
                <li
                  key={c.code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(c.code)}
                  className={[
                    'flex items-center justify-between px-4 py-2.5 cursor-pointer',
                    'transition-colors duration-100 group',
                    isSelected
                      ? 'bg-[#c9a84c]/10 text-[#c9a84c]'
                      : 'hover:bg-[#161928] text-white',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    {showFlag && (
                      <span className="text-xl leading-none select-none" aria-hidden="true">
                        {c.flag}
                      </span>
                    )}
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-[#c9a84c]' : 'text-white'
                        }`}
                      >
                        {c.code}
                      </p>
                      <p className="text-xs text-[#6b7280]">{c.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {showRate && c.code !== 'XAF' && (
                      <span
                        className={`text-xs font-mono ${
                          isSelected ? 'text-[#c9a84c]' : 'text-[#4b5563] group-hover:text-[#9ca3af]'
                        }`}
                      >
                        {c.rateToXAF.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
                      </span>
                    )}
                    {isSelected && (
                      <svg
                        className="w-4 h-4 text-[#c9a84c]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1e2130] flex items-center justify-between">
          <span className="text-[10px] text-[#374151] uppercase tracking-widest font-medium">
            PIMPAY Rates
          </span>
          <span className="text-[10px] text-[#374151]">
            {filtered.length} currencies
          </span>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TransactionTimeline
// ─────────────────────────────────────────────

const STATUS_CONFIG: Record<
  TimelineStatus,
  { dot: string; ring: string; label: string; icon: React.ReactNode }
> = {
  success: {
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30',
    label: 'Success',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  processing: {
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/30',
    label: 'Processing',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 9a8 8 0 0114.93-2M20 15a8 8 0 01-14.93 2" />
      </svg>
    ),
  },
  pending: {
    dot: 'bg-amber-400',
    ring: 'ring-amber-400/30',
    label: 'Pending',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    dot: 'bg-red-500',
    ring: 'ring-red-500/30',
    label: 'Error',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

const STATUS_TEXT: Record<TimelineStatus, string> = {
  success: 'text-emerald-400',
  processing: 'text-blue-400',
  pending: 'text-amber-400',
  error: 'text-red-400',
};

const STATUS_BG: Record<TimelineStatus, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20',
  processing: 'bg-blue-500/10 border-blue-500/20',
  pending: 'bg-amber-400/10 border-amber-400/20',
  error: 'bg-red-500/10 border-red-500/20',
};

function formatTimestamp(ts: string | Date): { date: string; time: string } {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function useIsVisible(ref: React.RefObject<Element>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return visible;
}

interface TimelineItemProps {
  event: TimelineEvent;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ event, index, isFirst, isLast }) => {
  const ref = useRef<HTMLDivElement>(null!);
  const visible = useIsVisible(ref);
  const config = STATUS_CONFIG[event.status];
  const { date, time } = formatTimestamp(event.timestamp);

  return (
    <div
      ref={ref}
      className="flex gap-0 group"
      style={{
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      {/* Left: Timestamp */}
      <div className="w-24 flex-shrink-0 pt-0.5 text-right pr-4">
        <p className="text-[11px] font-semibold text-[#9ca3af] tabular-nums">{time}</p>
        <p className="text-[10px] text-[#4b5563] mt-0.5">{date}</p>
      </div>

      {/* Center: Line + Dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Top connector */}
        <div
          className={`w-px flex-shrink-0 ${isFirst ? 'bg-transparent' : 'bg-[#2a2d3a]'}`}
          style={{ height: 10 }}
        />

        {/* Dot */}
        <div className="relative flex-shrink-0">
          {isFirst && (
            <span
              className={`absolute inset-0 rounded-full ${config.dot} opacity-30 animate-ping`}
              style={{ animationDuration: '2s' }}
            />
          )}
          <div
            className={[
              'w-7 h-7 rounded-full flex items-center justify-center z-10 relative',
              'ring-4 transition-all duration-300',
              config.dot,
              config.ring,
              isFirst
                ? 'shadow-[0_0_16px_rgba(201,168,76,0.25)] ring-[#c9a84c]/40'
                : '',
            ].join(' ')}
          >
            <span className="text-white">
              {event.icon ?? config.icon}
            </span>
          </div>
        </div>

        {/* Bottom connector */}
        {!isLast && (
          <div
            className="w-px bg-[#2a2d3a] flex-1 min-h-[2rem]"
            style={{ minHeight: 32 }}
          />
        )}
      </div>

      {/* Right: Content */}
      <div className={`flex-1 pb-8 pt-0 pl-4 ${isLast ? 'pb-0' : ''}`}>
        <div
          className={[
            'rounded-xl border p-3.5 transition-all duration-200',
            isFirst
              ? 'border-[#c9a84c]/30 bg-[#c9a84c]/5 shadow-[0_0_24px_-8px_rgba(201,168,76,0.2)]'
              : 'border-[#1e2130] bg-[#0d0f18] group-hover:border-[#2a2d3a]',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <p
              className={`text-sm font-semibold leading-snug ${
                isFirst ? 'text-[#c9a84c]' : 'text-white'
              }`}
            >
              {event.title}
            </p>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${STATUS_BG[event.status]} ${STATUS_TEXT[event.status]}`}
            >
              {config.label}
            </span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-[#6b7280] leading-relaxed mt-1">
              {event.description}
            </p>
          )}

          {/* Actor */}
          {event.actor && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-4 h-4 rounded-full bg-[#1e2130] flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-[#4b5563]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <span className="text-[11px] text-[#4b5563]">{event.actor}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TransactionTimelineProps {
  events: TimelineEvent[];
}

export const TransactionTimeline: React.FC<TransactionTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-[#1e2130] flex items-center justify-center mb-4">
          <svg
            className="w-6 h-6 text-[#374151]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-[#4b5563]">No transaction events yet</p>
      </div>
    );
  }

  return (
    <div className="w-full py-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 px-1">
        <div className="w-1 h-5 rounded-full bg-[#c9a84c]" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
          Transaction Timeline
        </h3>
        <span className="ml-auto text-xs text-[#4b5563] bg-[#1e2130] px-2 py-0.5 rounded-full">
          {events.length} events
        </span>
      </div>

      {/* Events */}
      <div className="relative">
        {events.map((event, index) => (
          <TimelineItem
            key={event.id}
            event={event}
            index={index}
            isFirst={index === 0}
            isLast={index === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Demo (default export)
// ─────────────────────────────────────────────

const DEMO_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date(),
    status: 'processing',
    title: 'Transaction en cours',
    description: 'Votre virement de 150 000 XAF est en cours de traitement par notre système.',
    actor: 'PIMPAY System',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: 'success',
    title: 'Identité vérifiée',
    description: 'Vérification KYC réussie. Identité confirmée avec succès.',
    actor: 'Compliance Bot',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 12 * 60 * 1000),
    status: 'pending',
    title: 'Validation manuelle requise',
    description: 'Un agent PIMPAY doit valider cette transaction avant traitement.',
    actor: 'Agent Jean-Pierre',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: 'success',
    title: 'Paiement initié',
    description: 'Transaction créée et enregistrée dans le système.',
    actor: 'Kofi Mensah',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'error',
    title: 'Tentative échouée',
    description: 'Solde insuffisant lors de la première tentative. Réessai effectué.',
    actor: 'PIMPAY Gateway',
  },
];

export default function PIMPAYDemo() {
  const [currency, setCurrency] = useState('XAF');

  return (
    <div className="min-h-screen bg-[#080b12] text-white p-6 md:p-10 font-sans">
      {/* Brand header */}
      <div className="mb-10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#a07828] flex items-center justify-center shadow-lg">
          <span className="text-sm font-black text-black">P</span>
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-[#c9a84c]">PIM</span>PAY
          </h1>
          <p className="text-[10px] text-[#4b5563] uppercase tracking-widest">Banking Portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Currency Selector card */}
        <div className="bg-[#0d0f18] border border-[#1e2130] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full bg-[#c9a84c]" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-widest">
              Currency Selector
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#6b7280] mb-2 uppercase tracking-wider">
                Select Currency
              </label>
              <CurrencySelector
                value={currency}
                onChange={setCurrency}
                showFlag
                showRate
              />
            </div>

            <div className="rounded-xl bg-[#0a0c14] border border-[#1e2130] p-4">
              <p className="text-xs text-[#4b5563] uppercase tracking-wider mb-2">Selected</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{CURRENCY_DATA[currency]?.flag ?? '💱'}</span>
                <div>
                  <p className="text-lg font-bold text-[#c9a84c]">{currency}</p>
                  <p className="text-xs text-[#6b7280]">{CURRENCY_DATA[currency]?.name}</p>
                </div>
                {currency !== 'XAF' && (
                  <div className="ml-auto text-right">
                    <p className="text-xs text-[#4b5563]">Rate to XAF</p>
                    <p className="text-sm font-mono text-white">
                      {CURRENCY_DATA[currency]?.rateToXAF.toLocaleString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#6b7280] mb-2 uppercase tracking-wider">
                Disabled State
              </label>
              <CurrencySelector
                value="EUR"
                onChange={() => {}}
                disabled
              />
            </div>
          </div>
        </div>

        {/* Transaction Timeline card */}
        <div className="bg-[#0d0f18] border border-[#1e2130] rounded-2xl p-6">
          <TransactionTimeline events={DEMO_EVENTS} />
        </div>
      </div>
    </div>
  );
}
