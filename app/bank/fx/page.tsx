'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Calculator, ArrowRightLeft, Info, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const GOLD = '#D4AF37';
const GOLD_LIGHT = '#F0D060';
const GOLD_DARK = '#A0842A';

const fxRates = [
  {
    pair: 'XAF/EUR',
    achat: 0.001521,
    vente: 0.001526,
    mid: 0.0015235,
    spread: 0.33,
    source: 'BEAC',
    validite: '2024-01-15 17:00',
    trend: 'up',
    change: '+0.02%',
  },
  {
    pair: 'XAF/USD',
    achat: 0.001647,
    vente: 0.001653,
    mid: 0.00165,
    spread: 0.36,
    source: 'BEAC',
    validite: '2024-01-15 17:00',
    trend: 'down',
    change: '-0.05%',
  },
  {
    pair: 'XAF/XOF',
    achat: 0.9985,
    vente: 1.0015,
    mid: 1.0,
    spread: 0.30,
    source: 'BCEAO',
    validite: '2024-01-15 17:00',
    trend: 'up',
    change: '+0.00%',
  },
  {
    pair: 'EUR/USD',
    achat: 1.0821,
    vente: 1.0835,
    mid: 1.0828,
    spread: 0.13,
    source: 'BCE',
    validite: '2024-01-15 17:00',
    trend: 'up',
    change: '+0.18%',
  },
  {
    pair: 'XAF/GBP',
    achat: 0.001292,
    vente: 0.001298,
    mid: 0.001295,
    spread: 0.46,
    source: 'BEAC',
    validite: '2024-01-15 17:00',
    trend: 'down',
    change: '-0.12%',
  },
];

const currencies = ['XAF', 'EUR', 'USD', 'XOF', 'GBP'];

const currencyNames: Record<string, string> = {
  XAF: 'Franc CFA BEAC',
  EUR: 'Euro',
  USD: 'Dollar américain',
  XOF: 'Franc CFA BCEAO',
  GBP: 'Livre sterling',
};

const directRates: Record<string, number> = {
  'XAF_EUR': 0.0015235,
  'EUR_XAF': 655.957,
  'XAF_USD': 0.00165,
  'USD_XAF': 606.06,
  'XAF_XOF': 1.0,
  'XOF_XAF': 1.0,
  'EUR_USD': 1.0828,
  'USD_EUR': 0.9235,
  'XAF_GBP': 0.001295,
  'GBP_XAF': 772.0,
  'EUR_GBP': 0.8562,
  'GBP_EUR': 1.1679,
  'USD_GBP': 0.7904,
  'GBP_USD': 1.265,
  'USD_XOF': 606.06,
  'XOF_USD': 0.00165,
  'EUR_XOF': 655.957,
  'XOF_EUR': 0.0015235,
  'GBP_XOF': 772.0,
  'XOF_GBP': 0.001295,
};

function generateHistoryData(pair: string, days: number = 30) {
  const baseRates: Record<string, number> = {
    'XAF/EUR': 0.0015235,
    'XAF/USD': 0.00165,
    'XAF/XOF': 1.0,
    'EUR/USD': 1.0828,
    'XAF/GBP': 0.001295,
  };
  const base = baseRates[pair] || 1.0;
  const data = [];
  const now = new Date('2024-01-15');
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const noise = (Math.random() - 0.5) * 0.02 * base;
    const trend = (i / days) * 0.005 * base * (Math.random() > 0.5 ? 1 : -1);
    data.push({
      date: date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      value: parseFloat((base + noise + trend).toFixed(pair === 'EUR/USD' ? 4 : pair === 'XAF/XOF' ? 4 : 8)),
    });
  }
  return data;
}

function formatRate(value: number, pair: string): string {
  if (pair === 'EUR/USD') return value.toFixed(4);
  if (pair === 'XAF/XOF') return value.toFixed(4);
  if (pair.startsWith('XAF/') || pair.startsWith('XOF/')) return value.toFixed(7);
  return value.toFixed(4);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-yellow-600/40 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">{label}</p>
        <p className="text-yellow-400 font-semibold text-sm">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function FXPage() {
  const [selectedPair, setSelectedPair] = useState('XAF/EUR');
  const [fromCurrency, setFromCurrency] = useState('XAF');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('');
  const [result, setResult] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [lastUpdated] = useState('15 jan. 2024 à 17:00');

  const historyData = useMemo(() => generateHistoryData(selectedPair), [selectedPair]);

  const selectedRate = fxRates.find(r => r.pair === selectedPair);

  const minVal = useMemo(() => Math.min(...historyData.map(d => d.value)), [historyData]);
  const maxVal = useMemo(() => Math.max(...historyData.map(d => d.value)), [historyData]);

  const handleCalculate = () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    setCalculating(true);
    setTimeout(() => {
      const key = `${fromCurrency}_${toCurrency}`;
      const rate = directRates[key];
      if (rate) {
        setResult(parseFloat(amount) * rate);
      } else {
        setResult(parseFloat(amount));
      }
      setCalculating(false);
    }, 600);
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
    setAmount('');
  };

  const getResultRate = () => {
    const key = `${fromCurrency}_${toCurrency}`;
    return directRates[key] || 1;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: GOLD }}>
              Taux de Change
            </h1>
            <p className="text-gray-400 mt-1 text-sm">Marchés des changes en temps réel — PIMPAY FX Desk</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Mis à jour : {lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Key Rate Banner */}
      <div
        className="rounded-2xl p-5 mb-8 border relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1400 0%, #2a1f00 50%, #1a1400 100%)',
          borderColor: GOLD_DARK,
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${GOLD} 0%, transparent 60%)`,
          }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
              style={{ background: GOLD, color: '#1a0f00' }}
            >
              €
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-black" style={{ color: GOLD_LIGHT }}>
                  1 EUR = 655,957 XAF
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: GOLD_DARK + '40', color: GOLD_LIGHT, border: `1px solid ${GOLD_DARK}` }}
                >
                  TAUX FIXE
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-0.5">
                Parité fixe CEMAC — Convention de coopération monétaire France/Afrique Centrale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-400/70">
            <Info className="w-4 h-4" />
            <span>Parité irréversible depuis 1999</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Rate Table */}
        <div className="xl:col-span-2">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h2 className="font-semibold text-white">Tableau des Taux</h2>
              <span className="text-xs text-gray-500">Spread en % · Taux indicatifs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Paire', 'Achat', 'Vente', 'Mid', 'Spread', 'Source', 'Validité'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fxRates.map((rate, idx) => (
                    <tr
                      key={rate.pair}
                      onClick={() => setSelectedPair(rate.pair)}
                      className={`border-b border-gray-800/50 cursor-pointer transition-all duration-200 ${
                        selectedPair === rate.pair
                          ? 'bg-yellow-900/20'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-6 rounded-full"
                            style={{
                              background: selectedPair === rate.pair ? GOLD : 'transparent',
                            }}
                          />
                          <div>
                            <div className="font-bold text-white text-sm">{rate.pair}</div>
                            <div
                              className={`text-xs flex items-center gap-1 mt-0.5 ${
                                rate.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                              }`}
                            >
                              {rate.trend === 'up' ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {rate.change}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300 font-mono">
                        {formatRate(rate.achat, rate.pair)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300 font-mono">
                        {formatRate(rate.vente, rate.pair)}
                      </td>
                      <td className="px-4 py-4 text-sm font-mono font-semibold" style={{ color: GOLD }}>
                        {formatRate(rate.mid, rate.pair)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full"
                          style={{
                            background:
                              rate.spread < 0.3
                                ? '#052e16'
                                : rate.spread < 0.4
                                ? '#1c1917'
                                : '#2d1515',
                            color:
                              rate.spread < 0.3
                                ? '#4ade80'
                                : rate.spread < 0.4
                                ? '#fbbf24'
                                : '#f87171',
                          }}
                        >
                          {rate.spread.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className="text-xs px-2 py-1 rounded font-medium"
                          style={{
                            background: GOLD_DARK + '25',
                            color: GOLD_LIGHT,
                            border: `1px solid ${GOLD_DARK}50`,
                          }}
                        >
                          {rate.source}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500">{rate.validite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FX Calculator */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-5 h-5" style={{ color: GOLD }} />
            <h2 className="font-semibold text-white">Calculateur FX</h2>
          </div>

          <div className="space-y-4">
            {/* Amount */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Montant</label>
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setResult(null); }}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-yellow-600 transition-colors placeholder-gray-600"
              />
            </div>

            {/* From Currency */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Devise source</label>
              <div className="relative">
                <select
                  value={fromCurrency}
                  onChange={e => { setFromCurrency(e.target.value); setResult(null); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-yellow-600 transition-colors appearance-none cursor-pointer"
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c} — {currencyNames[c]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSwap}
                className="w-10 h-10 rounded-full border border-gray-700 bg-gray-800 flex items-center justify-center hover:border-yellow-600 hover:bg-gray-700 transition-all duration-200 group"
              >
                <ArrowRightLeft className="w-4 h-4 text-gray-400 group-hover:text-yellow-400 transition-colors" />
              </button>
            </div>

            {/* To Currency */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider mb-1.5 block">Devise cible</label>
              <div className="relative">
                <select
                  value={toCurrency}
                  onChange={e => { setToCurrency(e.target.value); setResult(null); }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-yellow-600 transition-colors appearance-none cursor-pointer"
                >
                  {currencies.map(c => (
                    <option key={c} value={c}>{c} — {currencyNames[c]}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculate}
              disabled={calculating || !amount}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: calculating || !amount ? '#374151' : `linear-gradient(135deg, ${GOLD_DARK}, ${GOLD}, ${GOLD_LIGHT})`,
                color: calculating || !amount ? '#9ca3af' : '#1a0f00',
              }}
            >
              {calculating ? 'Calcul en cours...' : 'Calculer'}
            </button>

            {/* Result */}
            {result !== null && (
              <div
                className="rounded-xl p-4 border"
                style={{
                  background: 'linear-gradient(135deg, #1a1400 0%, #2a1f00 100%)',
                  borderColor: GOLD_DARK,
                }}
              >
                <div className="text-xs text-gray-400 mb-1">Résultat de conversion</div>
                <div className="text-2xl font-black" style={{ color: GOLD_LIGHT }}>
                  {result.toLocaleString('fr-FR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: toCurrency === 'XAF' || toCurrency === 'XOF' ? 0 : 4,
                  })}{' '}
                  {toCurrency}
                </div>
                <div className="text-xs text-gray-500 mt-1.5">
                  Taux appliqué : 1 {fromCurrency} = {getResultRate().toLocaleString('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 7 })} {toCurrency}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Chart */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-semibold text-white">Historique des Taux — 30 jours</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cliquez sur une paire dans le tableau pour afficher son historique</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {fxRates.map(r => (
              <button
                key={r.pair}
                onClick={() => setSelectedPair(r.pair)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  background: selectedPair === r.pair ? GOLD : '#1f2937',
                  color: selectedPair === r.pair ? '#1a0f00' : '#9ca3af',
                  border: `1px solid ${selectedPair === r.pair ? GOLD : '#374151'}`,
                }}
              >
                {r.pair}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Min 30j', value: formatRate(minVal, selectedPair), color: '#f87171' },
            { label: 'Mid actuel', value: formatRate(selectedRate?.mid || 0, selectedPair), color: GOLD },
            { label: 'Max 30j', value: formatRate(maxVal, selectedPair), color: '#4ade80' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-800/60 rounded-xl p-3 text-center border border-gray-700/50">
              <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
              <div className="font-bold text-sm font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
                tickFormatter={v => v.toFixed(selectedPair === 'EUR/USD' || selectedPair === 'XAF/XOF' ? 4 : 7)}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={selectedRate?.mid || 0}
                stroke={GOLD_DARK}
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={GOLD}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: GOLD, stroke: '#1a0f00', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ background: GOLD }} />
            <span className="text-xs text-gray-500">Taux mid {selectedPair}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t border-dashed" style={{ borderColor: GOLD_DARK }} />
            <span className="text-xs text-gray-500">Taux de référence</span>
          </div>
          <div className="ml-auto text-xs text-gray-600">Données simulées à des fins de démonstration</div>
        </div>
      </div>
    </div>
  );
}
