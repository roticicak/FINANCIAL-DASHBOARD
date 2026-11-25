import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CalendarRange,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ActiveTab, CATEGORY_COLORS } from '../../types/finance';
import {
  formatMoney,
  formatShortDate,
  getMonthlySummaries,
  getWeeklySummaries,
} from '../../utils/finance';
import { SpotlightCard } from '../ui/SpotlightCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { SegmentedControl } from '../ui/SegmentedControl';

interface OverviewViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
  },
};

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const { entries, currency, openAddModal, openPnLReportModal } = useFinance();
  const [chartSpan, setChartSpan] = useState<'weekly' | 'monthly'>('weekly');
  const [activeSlice, setActiveSlice] = useState<number | null>(null);

  const metrics = useMemo(() => {
    const totalIncome = entries
      .filter((e) => e.type === 'income')
      .reduce((s, e) => s + e.amount, 0);
    const totalExpenses = entries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0);
    const totalInvested = entries
      .filter((e) => e.type === 'investment')
      .reduce((s, e) => s + e.amount, 0);
    const currentPortfolioValue = entries
      .filter((e) => e.type === 'investment')
      .reduce((s, e) => s + (e.currentValue ?? e.amount), 0);

    const pnlEntries = entries.filter(
      (e) => e.pnlTracked && typeof e.pnlAmount === 'number'
    );
    const totalProfit = pnlEntries
      .filter((e) => (e.pnlAmount || 0) > 0)
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);
    const totalLoss = pnlEntries
      .filter((e) => (e.pnlAmount || 0) < 0)
      .reduce((s, e) => s + Math.abs(e.pnlAmount || 0), 0);
    const netPnL = totalProfit - totalLoss;

    const expensePnL = pnlEntries
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + (e.pnlAmount || 0), 0);

    const liquidCash = totalIncome - totalExpenses - totalInvested + expensePnL;
    const totalNetWorth = liquidCash + currentPortfolioValue;
    const savingsRate =
      totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      totalInvested,
      currentPortfolioValue,
      totalProfit,
      totalLoss,
      netPnL,
      liquidCash,
      totalNetWorth,
      savingsRate,
      pnlCount: pnlEntries.length,
    };
  }, [entries]);

  const weeklySummaries = useMemo(() => getWeeklySummaries(entries), [entries]);
  const monthlySummaries = useMemo(() => getMonthlySummaries(entries), [entries]);

  const latestWeek = weeklySummaries[0];
  const latestMonth = monthlySummaries[0];

  const chartData = useMemo(() => {
    if (chartSpan === 'weekly') {
      return [...weeklySummaries]
        .slice(0, 6)
        .reverse()
        .map((w) => ({
          name: w.shortLabel,
          Income: Math.round(w.income),
          Expenses: Math.round(w.expenses),
          Investments: Math.round(w.investments),
          NetPnL: Math.round(w.netPnL),
        }));
    }
    return [...monthlySummaries]
      .slice(0, 6)
      .reverse()
      .map((m) => ({
        name: m.shortLabel,
        Income: Math.round(m.income),
        Expenses: Math.round(m.expenses),
        Investments: Math.round(m.investments),
        NetPnL: Math.round(m.netPnL),
      }));
  }, [chartSpan, weeklySummaries, monthlySummaries]);

  const allocationData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.type === 'expense' || e.type === 'investment') {
        map[e.category] = (map[e.category] || 0) + e.amount;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || '#10B981',
      }));
  }, [entries]);

  const totalAllocation = allocationData.reduce((s, x) => s + x.value, 0);

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
    [entries]
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Hero Banner */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/90 px-3 py-1 text-xs font-bold text-emerald-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Financial Command Center
          </div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Your money,{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              in full clarity.
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-xl">
            Track every income stream, daily expense, investment allocation, and real-time profit &amp; loss with automated weekly and monthly summaries.
          </p>
        </div>

        {/* Quick Action Strip */}
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('income')}
            className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Income
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('expense')}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Expense
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('investment')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Investment
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => openAddModal('pnl')}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/90 px-3.5 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            <TrendingUp className="h-3.5 w-3.5" /> Report P&amp;L
          </motion.button>
        </div>
      </motion.div>

      {/* Top 4 KPI Bento Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total Net Worth */}
        <motion.div variants={itemVariants}>
          <SpotlightCard accent="emerald" className="p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Net Worth
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25">
                <Wallet className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <AnimatedNumber
                value={metrics.totalNetWorth}
                currency={currency}
                className="text-2xl sm:text-3xl font-extrabold text-slate-900"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200/60">
                <Sparkles className="h-3 w-3" />
                {metrics.savingsRate.toFixed(0)}% Retained
              </span>
              <span className="text-slate-400 font-medium">
                Cash + Portfolio
              </span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 2: Total Income vs Expenses */}
        <motion.div variants={itemVariants}>
          <SpotlightCard accent="blue" className="p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Operating Cash Flow
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25">
                <ArrowDownLeft className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <AnimatedNumber
                value={metrics.totalIncome - metrics.totalExpenses}
                currency={currency}
                showSign
                className="text-2xl sm:text-3xl font-extrabold text-slate-900"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-medium">
              <span className="text-emerald-600 font-bold">
                In {formatMoney(metrics.totalIncome, currency, { compact: true })}
              </span>
              <span className="text-rose-500 font-bold">
                Out {formatMoney(metrics.totalExpenses, currency, { compact: true })}
              </span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 3: Investment Portfolio */}
        <motion.div variants={itemVariants}>
          <SpotlightCard accent="amber" className="p-5 h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Investment Capital
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25">
                <Landmark className="h-4.5 w-4.5" />
              </div>
            </div>
            <div className="mt-3">
              <AnimatedNumber
                value={metrics.currentPortfolioValue}
                currency={currency}
                className="text-2xl sm:text-3xl font-extrabold text-slate-900"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">
                Cost {formatMoney(metrics.totalInvested, currency, { compact: true })}
              </span>
              <span
                className={`font-mono-num font-bold ${
                  metrics.currentPortfolioValue >= metrics.totalInvested
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {metrics.totalInvested > 0
                  ? `${
                      metrics.currentPortfolioValue >= metrics.totalInvested ? '+' : ''
                    }${(
                      ((metrics.currentPortfolioValue - metrics.totalInvested) /
                        metrics.totalInvested) *
                      100
                    ).toFixed(1)}%`
                  : '0.0%'}
              </span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Card 4: Net Profit & Loss */}
        <motion.div variants={itemVariants}>
          <SpotlightCard
            accent={metrics.netPnL >= 0 ? 'emerald' : 'rose'}
            className="p-5 h-full"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Reported Net P&amp;L
              </span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md ${
                  metrics.netPnL >= 0
                    ? 'bg-gradient-to-br from-emerald-500 to-lime-500 shadow-emerald-500/25'
                    : 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/25'
                }`}
              >
                {metrics.netPnL >= 0 ? (
                  <TrendingUp className="h-4.5 w-4.5" />
                ) : (
                  <TrendingDown className="h-4.5 w-4.5" />
                )}
              </div>
            </div>
            <div className="mt-3">
              <AnimatedNumber
                value={metrics.netPnL}
                currency={currency}
                showSign
                className={`text-2xl sm:text-3xl font-extrabold ${
                  metrics.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-600">
                +{formatMoney(metrics.totalProfit, currency, { compact: true })} Profit
              </span>
              <span className="text-rose-500">
                -{formatMoney(metrics.totalLoss, currency, { compact: true })} Loss
              </span>
            </div>
          </SpotlightCard>
        </motion.div>
      </div>

      {/* Main Analytics Bento Row */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Cash Flow & Investment Momentum Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <SpotlightCard accent="emerald" interactive={false} className="p-6 h-full">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-900">
                  Cash Flow &amp; Investment Pulse
                </h2>
                <p className="text-xs text-slate-500">
                  Compare income inflows against expenses &amp; capital deployed
                </p>
              </div>
              <SegmentedControl
                layoutId="overview-chart-span"
                size="sm"
                activeTone="emerald"
                value={chartSpan}
                onChange={setChartSpan}
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
            </div>

            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke="#E2E8F0"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    tickFormatter={(v) =>
                      formatMoney(v, currency, { compact: true })
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-xl shadow-slate-900/10 backdrop-blur-md">
                          <p className="mb-1.5 text-xs font-extrabold text-slate-900">
                            {label}
                          </p>
                          <div className="space-y-1">
                            {payload.map((p, idx) => (
                              <div
                                key={`${String(p.dataKey)}-${idx}`}
                                className="flex items-center justify-between gap-5 text-xs"
                              >
                                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: p.color }}
                                  />
                                  {p.name}
                                </span>
                                <span className="font-mono-num font-bold text-slate-900">
                                  {formatMoney(Number(p.value || 0), currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    stroke="#059669"
                    strokeWidth={2.6}
                    fill="url(#gradIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Expenses"
                    stroke="#F43F5E"
                    strokeWidth={2.4}
                    fill="url(#gradExpense)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Investments"
                    stroke="#F59E0B"
                    strokeWidth={2.4}
                    fill="url(#gradInvest)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                Expenses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                Investments
              </span>
            </div>
          </SpotlightCard>
        </motion.div>

        {/* Interactive Allocation Donut */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <SpotlightCard accent="amber" interactive={false} className="p-6 h-full flex flex-col">
            <div>
              <h2 className="font-display text-lg font-extrabold text-slate-900">
                Outflow Allocation
              </h2>
              <p className="text-xs text-slate-500">
                Hover a slice to inspect spend &amp; investment share
              </p>
            </div>

            <div className="relative mt-2 h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      allocationData.length > 0
                        ? allocationData
                        : [{ name: 'No Data', value: 1, color: '#E2E8F0' }]
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={allocationData.length > 0 ? 4 : 0}
                    cornerRadius={8}
                    onMouseEnter={(_, idx) =>
                      allocationData.length > 0 && setActiveSlice(idx)
                    }
                    onMouseLeave={() => setActiveSlice(null)}
                  >
                    {(allocationData.length > 0
                      ? allocationData
                      : [{ name: 'No Data', value: 1, color: '#E2E8F0' }]
                    ).map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                        opacity={activeSlice === null || activeSlice === idx ? 1 : 0.38}
                        style={{
                          transition: 'opacity 220ms ease',
                          cursor: allocationData.length > 0 ? 'pointer' : 'default',
                        }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Dynamic Readout */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[110px]">
                  {activeSlice !== null && allocationData[activeSlice]
                    ? allocationData[activeSlice].name
                    : 'Total Outflow'}
                </span>
                <span className="font-mono-num mt-0.5 text-base font-extrabold text-slate-900">
                  {formatMoney(
                    activeSlice !== null && allocationData[activeSlice]
                      ? allocationData[activeSlice].value
                      : totalAllocation,
                    currency,
                    { compact: true }
                  )}
                </span>
              </div>
            </div>

            <div className="mt-auto space-y-2 pt-2">
              {allocationData.slice(0, 4).map((item, idx) => (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveSlice(idx)}
                  onMouseLeave={() => setActiveSlice(null)}
                  className="flex items-center justify-between rounded-xl px-2 py-1 text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 font-semibold text-slate-700 truncate">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="font-mono-num font-bold text-slate-900 ml-2">
                    {totalAllocation > 0
                      ? `${((item.value / totalAllocation) * 100).toFixed(0)}%`
                      : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>

      {/* Bottom Row: Weekly & Monthly Executive Cards + Recent Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Latest Weekly & Monthly Snapshot Cards */}
        <motion.div variants={itemVariants} className="lg:col-span-5 space-y-4">
          {latestWeek && (
            <SpotlightCard accent="blue" className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                    <CalendarRange className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                      End-of-Week Summary
                    </p>
                    <h3 className="font-display text-sm font-extrabold text-slate-900">
                      {latestWeek.label}
                    </h3>
                  </div>
                </div>
                <span className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm">
                  Grade {latestWeek.healthGrade}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-emerald-50/70 p-2.5 border border-emerald-100">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Income</p>
                  <p className="font-mono-num mt-0.5 text-sm font-extrabold text-emerald-900">
                    {formatMoney(latestWeek.income, currency, { compact: true })}
                  </p>
                </div>
                <div className="rounded-2xl bg-rose-50/70 p-2.5 border border-rose-100">
                  <p className="text-[10px] font-bold uppercase text-rose-700">Expenses</p>
                  <p className="font-mono-num mt-0.5 text-sm font-extrabold text-rose-900">
                    {formatMoney(latestWeek.expenses, currency, { compact: true })}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50/70 p-2.5 border border-amber-100">
                  <p className="text-[10px] font-bold uppercase text-amber-700">Net P&amp;L</p>
                  <p
                    className={`font-mono-num mt-0.5 text-sm font-extrabold ${
                      latestWeek.netPnL >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {formatMoney(latestWeek.netPnL, currency, {
                      compact: true,
                      showSign: true,
                    })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('summaries')}
                className="mt-3.5 flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors cursor-pointer"
              >
                <span>Open Full Weekly &amp; Monthly Summaries</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </SpotlightCard>
          )}

          {latestMonth && (
            <SpotlightCard accent="emerald" className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                    Monthly Wrap-Up
                  </p>
                  <h3 className="font-display text-base font-extrabold text-slate-900">
                    {latestMonth.label}
                  </h3>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {latestMonth.healthLabel}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>Invested this month</span>
                <span className="font-mono-num font-bold text-amber-600">
                  {formatMoney(latestMonth.investments, currency)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600">
                <span>Monthly Net Cash Flow</span>
                <span
                  className={`font-mono-num font-bold ${
                    latestMonth.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatMoney(latestMonth.netCashFlow, currency, { showSign: true })}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-600">
                <span>Monthly Reported P&amp;L</span>
                <span
                  className={`font-mono-num font-bold ${
                    latestMonth.netPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {formatMoney(latestMonth.netPnL, currency, { showSign: true })}
                </span>
              </div>
            </SpotlightCard>
          )}
        </motion.div>

        {/* Recent Ledger Activity */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
          <SpotlightCard accent="neutral" interactive={false} className="p-6 h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-900">
                  Recent Ledger Activity
                </h2>
                <p className="text-xs text-slate-500">
                  Latest income, expenses, investments &amp; P&amp;L updates
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('cashflow')}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                View All <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {recentEntries.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">
                  No entries yet. Click &ldquo;Record Entry&rdquo; to begin!
                </p>
              ) : (
                recentEntries.map((item) => (
                  <div
                    key={item.id}
                    className="group flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/70 -mx-2 px-2 rounded-2xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                          item.type === 'income'
                            ? 'bg-emerald-100/90 text-emerald-700'
                            : item.type === 'investment'
                              ? 'bg-amber-100/90 text-amber-700'
                              : 'bg-rose-100/90 text-rose-700'
                        }`}
                      >
                        {item.type === 'income' ? (
                          <ArrowDownLeft className="h-4.5 w-4.5" />
                        ) : item.type === 'investment' ? (
                          <Landmark className="h-4.5 w-4.5" />
                        ) : (
                          <ArrowUpRight className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {item.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span>{item.category}</span>
                          <span>•</span>
                          <span>{formatShortDate(item.date)}</span>
                          {item.pnlTracked && typeof item.pnlAmount === 'number' && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                item.pnlAmount >= 0
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              P&amp;L{' '}
                              {formatMoney(item.pnlAmount, currency, {
                                showSign: true,
                                compact: true,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.type !== 'income' && (
                        <button
                          type="button"
                          onClick={() => openPnLReportModal(item)}
                          className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700 transition-all hover:bg-sky-100 cursor-pointer"
                        >
                          P&amp;L
                        </button>
                      )}
                      <span
                        className={`font-mono-num text-sm font-extrabold ${
                          item.type === 'income'
                            ? 'text-emerald-600'
                            : item.type === 'investment'
                              ? 'text-amber-600'
                              : 'text-slate-900'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatMoney(item.amount, currency)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </SpotlightCard>
        </motion.div>
      </div>
    </motion.div>
  );
};
