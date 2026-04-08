'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS = {
  primaryGold: '#C8A961',
  secondary: '#3B82F6',
  tertiary: '#10B981',
  quaternary: '#F59E0B',
  error: '#EF4444',
  grid: '#1F2937',
  text: '#9CA3AF',
  tooltipBg: '#1F2937',
  tooltipBorder: '#374151',
};

const DEFAULT_HEIGHT = 300;

// ─── French Number Formatter ─────────────────────────────────────────────────

const formatFrenchNumber = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatFrenchCurrency = (value: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatAxisValue = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `${formatFrenchNumber(value / 1_000_000)}M`;
  if (Math.abs(value) >= 1_000) return `${formatFrenchNumber(value / 1_000)}k`;
  return formatFrenchNumber(value);
};

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC<{ height: number }> = ({ height }) => (
  <div
    className="animate-pulse rounded-xl bg-gradient-to-br from-[#1F2937]/60 to-[#111827]/80"
    style={{ height }}
  >
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <div className="h-3 w-1/3 rounded-full bg-[#374151]" />
      <div className="h-2 w-1/2 rounded-full bg-[#374151]/60" />
      <div className="mt-4 flex w-full items-end justify-around gap-2" style={{ height: height * 0.5 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-full rounded-t bg-[#374151]/40"
            style={{ height: `${Math.random() * 60 + 30}%` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ─── Chart Header ─────────────────────────────────────────────────────────────

interface ChartHeaderProps {
  title?: string;
  subtitle?: string;
}

const ChartHeader: React.FC<ChartHeaderProps> = ({ title, subtitle }) => {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-4">
      {title && (
        <h3 className="text-base font-semibold tracking-wide" style={{ color: COLORS.primaryGold }}>
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="mt-0.5 text-xs" style={{ color: COLORS.text }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip: React.FC<TooltipProps<number, string> & { labelFormatter?: (label: string) => string }> = ({
  active,
  payload,
  label,
  labelFormatter,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      className="rounded-lg border px-4 py-3 shadow-2xl"
      style={{
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
        minWidth: 140,
      }}
    >
      <p className="mb-2 text-xs font-medium" style={{ color: COLORS.text }}>
        {labelFormatter ? labelFormatter(label as string) : label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color as string }}
          />
          <span className="text-xs" style={{ color: COLORS.text }}>
            {entry.name}:
          </span>
          <span className="text-xs font-semibold text-white">
            {typeof entry.value === 'number' ? formatFrenchNumber(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Shared Axis Props ────────────────────────────────────────────────────────

const sharedXAxisProps = {
  tick: { fill: COLORS.text, fontSize: 11 },
  axisLine: { stroke: COLORS.grid },
  tickLine: { stroke: COLORS.grid },
};

const sharedYAxisProps = {
  tick: { fill: COLORS.text, fontSize: 11 },
  axisLine: { stroke: COLORS.grid },
  tickLine: { stroke: COLORS.grid },
  tickFormatter: formatAxisValue,
};

const sharedGridProps = {
  strokeDasharray: '3 3',
  stroke: COLORS.grid,
  vertical: false,
};

// ─── 1. AreaChartWidget ───────────────────────────────────────────────────────

interface AreaChartWidgetProps {
  data: { date: string; value: number }[];
  dataKey?: string;
  color?: string;
  gradientOpacity?: number;
  loading?: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}

export const AreaChartWidget: React.FC<AreaChartWidgetProps> = ({
  data,
  dataKey = 'value',
  color = COLORS.primaryGold,
  gradientOpacity = 0.4,
  loading = false,
  height = DEFAULT_HEIGHT,
  title,
  subtitle,
}) => {
  const gradientId = useMemo(() => `areaGradient-${Math.random().toString(36).slice(2)}`, []);

  if (loading) return <LoadingSkeleton height={height} />;

  return (
    <div className="w-full">
      <ChartHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={gradientOpacity} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...sharedGridProps} />
          <XAxis dataKey="date" {...sharedXAxisProps} />
          <YAxis {...sharedYAxisProps} width={60} />
          <Tooltip
            content={
              <CustomTooltip />
            }
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: '#111827',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 2. BarChartWidget ────────────────────────────────────────────────────────

interface BarConfig {
  key: string;
  color: string;
  name: string;
}

interface BarChartWidgetProps {
  data: { name: string; value?: number; [key: string]: unknown }[];
  bars: BarConfig[];
  stacked?: boolean;
  loading?: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}

const RoundedBar = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  radius?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, fill, radius = 4 } = props;
  if (height <= 0) return null;
  const r = Math.min(radius, width / 2, height / 2);
  return (
    <path
      d={`M${x + r},${y} h${width - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${height - r} h${-width} v${-(height - r)} a${r},${r} 0 0 1 ${r},-${r} z`}
      fill={fill}
    />
  );
};

export const BarChartWidget: React.FC<BarChartWidgetProps> = ({
  data,
  bars,
  stacked = false,
  loading = false,
  height = DEFAULT_HEIGHT,
  title,
  subtitle,
}) => {
  if (loading) return <LoadingSkeleton height={height} />;

  return (
    <div className="w-full">
      <ChartHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barCategoryGap="25%"
          barGap={4}
        >
          <CartesianGrid {...sharedGridProps} />
          <XAxis dataKey="name" {...sharedXAxisProps} />
          <YAxis {...sharedYAxisProps} width={60} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          {bars.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: COLORS.text, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
            />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              name={bar.name}
              fill={bar.color}
              stackId={stacked ? 'stack' : undefined}
              shape={stacked ? undefined : (props: unknown) => {
                const p = props as { x: number; y: number; width: number; height: number; fill: string };
                return <RoundedBar {...p} radius={4} />;
              }}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 3. PieChartWidget ────────────────────────────────────────────────────────

interface PieChartWidgetProps {
  data: { name: string; value: number; color?: string }[];
  donut?: boolean;
  showLabels?: boolean;
  showLegend?: boolean;
  loading?: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}

const DEFAULT_PIE_COLORS = [
  COLORS.primaryGold,
  COLORS.secondary,
  COLORS.tertiary,
  COLORS.quaternary,
  COLORS.error,
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
];

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
}

const renderCustomOuterLabel = (props: CustomLabelProps) => {
  const { cx, cy, midAngle, outerRadius, percent, name } = props;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.04) return null;
  return (
    <text
      x={x}
      y={y}
      fill={COLORS.text}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={10}
    >
      <tspan x={x} dy="0" fill="#E5E7EB" fontWeight={500}>
        {name}
      </tspan>
      <tspan x={x} dy="13" fill={COLORS.text}>
        {`${(percent * 100).toFixed(1)}%`}
      </tspan>
    </text>
  );
};

export const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  data,
  donut = true,
  showLabels = true,
  showLegend = true,
  loading = false,
  height = DEFAULT_HEIGHT,
  title,
  subtitle,
}) => {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const innerRadius = donut ? '55%' : '0%';
  const outerRadius = showLabels ? '62%' : '75%';

  if (loading) return <LoadingSkeleton height={height} />;

  return (
    <div className="w-full">
      <ChartHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <PieChart margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={donut ? 3 : 1}
            dataKey="value"
            labelLine={false}
            label={showLabels ? (props) => renderCustomOuterLabel(props as CustomLabelProps) : undefined}
            strokeWidth={2}
            stroke="#111827"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color ?? DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
              />
            ))}
          </Pie>
          {donut && (
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              <tspan
                x="50%"
                dy="-8"
                fontSize={18}
                fontWeight={700}
                fill={COLORS.primaryGold}
              >
                {formatAxisValue(total)}
              </tspan>
              <tspan
                x="50%"
                dy="20"
                fontSize={10}
                fill={COLORS.text}
              >
                Total
              </tspan>
            </text>
          )}
          <Tooltip
            content={<CustomTooltip />}
          />
          {showLegend && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: COLORS.text, paddingTop: 12 }}
              formatter={(value) => (
                <span style={{ color: '#D1D5DB', fontSize: 11 }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── 4. LineChartWidget ───────────────────────────────────────────────────────

interface LineConfig {
  key: string;
  color: string;
  name: string;
  dashed?: boolean;
}

interface LineChartWidgetProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
  loading?: boolean;
  height?: number;
  title?: string;
  subtitle?: string;
}

export const LineChartWidget: React.FC<LineChartWidgetProps> = ({
  data,
  lines,
  loading = false,
  height = DEFAULT_HEIGHT,
  title,
  subtitle,
}) => {
  if (loading) return <LoadingSkeleton height={height} />;

  return (
    <div className="w-full">
      <ChartHeader title={title} subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
        >
          <CartesianGrid {...sharedGridProps} />
          <XAxis
            dataKey="date"
            {...sharedXAxisProps}
          />
          <YAxis {...sharedYAxisProps} width={60} />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: COLORS.grid, strokeWidth: 1 }}
          />
          {lines.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: 11, color: COLORS.text, paddingTop: 12 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: '#D1D5DB', fontSize: 11 }}>{value}</span>
              )}
            />
          )}
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2.5}
              strokeDasharray={line.dashed ? '6 3' : undefined}
              dot={{
                r: 3,
                fill: line.color,
                stroke: '#111827',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 6,
                fill: line.color,
                stroke: '#111827',
                strokeWidth: 2,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── Export All ───────────────────────────────────────────────────────────────

export { COLORS as ChartColors, formatFrenchNumber, formatFrenchCurrency, formatAxisValue };

export default {
  AreaChartWidget,
  BarChartWidget,
  PieChartWidget,
  LineChartWidget,
};
